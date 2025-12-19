import { program } from "commander";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as util from "node:util";
import * as child_process from "node:child_process";
import { glob } from "glob";
import { heredoc } from "./lib/heredoc.mjs";
import { discoverVersions, findCurrentVersion } from "./lib/version-discovery.mjs";
import { generateNetlifyRedirects, getStableVersions } from "./lib/redirects-generator.mjs";
import { fixImagePaths } from "./lib/fix-image-paths.mjs";
import { transformContent } from "./lib/transform-content.mjs";
import { processContentLinks } from "./lib/process-content-links.mjs";
import { ROOT_MD_MAPPINGS } from "./lib/root-mappings.mjs";
import { generateFileMetadata } from "./lib/file-metadata.mjs";
import { generateFrontMatter } from "./lib/frontmatter.mjs";

const exec = util.promisify(child_process.exec);

program
  .version("0.0.0", "-v, --version")
  .requiredOption("-c, --core <path>", "path to core project folder")
  .requiredOption("-s, --site <path>", "path to docs site folder")
  .requiredOption("-e, --examples <path>", "path to pepr-excellent-examples repository")
  .option("-n, --no-dist", "do not generate /dist output")
  .parse();
const opts = program.opts();

const RUN = { cutoff: 2 }; // Global build state. cutoff: minimum versions to keep before retiring

// Error-handling wrapper that captures logs and provides structured error reporting
async function executeWithErrorHandling(label, func) {
  let log = [];
  let err = "";

  try {
    await func(log);
  } catch (e) {
    err = e;
  } finally {
    if (err) {
      ["", err, "", "State dump:", RUN].forEach(m => console.error(m));
      program.error("");
    }
  }
}

// Efficient content processing pipeline with parallel file processing
async function processAllContent(contentDir) {
  const contentFiles = await glob(`${contentDir}/**/*.md`);

  // Process files in parallel and collect results
  const results = await Promise.all(
    contentFiles.map(async contentFile => {
      const originalContent = await fs.readFile(contentFile, "utf8");
      let processedContent = originalContent;
      let imagePathsFixed = false;

      // Apply image path fixes
      const afterImageFix = fixImagePaths(processedContent);
      if (afterImageFix !== processedContent) {
        imagePathsFixed = true;
        processedContent = afterImageFix;
      }

      // Write file only if changes were made
      if (originalContent !== processedContent) {
        await fs.writeFile(contentFile, processedContent);
        return { updated: true, imagePathsFixed };
      }

      return { updated: false, imagePathsFixed: false };
    }),
  );

  // Aggregate results
  const updatedFilesCount = results.filter(r => r.updated).length;
  const imagePathsFixedCount = results.filter(r => r.imagePathsFixed).length;

  if (updatedFilesCount > 0) {
    console.log(`Updated ${updatedFilesCount} files`);
    if (imagePathsFixedCount > 0) {
      console.log(`Fixed image paths in ${imagePathsFixedCount} files`);
    }
  }
}

const TOTAL = "Total build time";
console.time(TOTAL);

await executeWithErrorHandling(`Validate args`, async log => {
  const dirOrDie = async path => {
    if (!(await fs.stat(path)).isDirectory()) {
      throw new Error(`Not a directory: '${path}'`);
    }
  };

  RUN.site = path.resolve(opts.site);
  await dirOrDie(RUN.site);

  RUN.core = path.resolve(opts.core);
  await dirOrDie(RUN.core);

  log.push(["site", RUN.site]);
  log.push(["core", RUN.core]);
});

// Ensure tmp directory is created relative to the docs directory, not wherever the script runs from
RUN.tmp = path.resolve(path.dirname(RUN.site), "../../tmp");

await executeWithErrorHandling(`Clean tmp dir`, async log => {
  await fs.rm(RUN.tmp, { recursive: true, force: true });
  await fs.mkdir(RUN.tmp);

  log.push(["tmp", RUN.tmp]);
});

await executeWithErrorHandling(`Copy site src to tmp dir`, async () => {
  await fs.cp(RUN.site, RUN.tmp, { recursive: true });
});

await executeWithErrorHandling(`Search core repo versions`, async log => {
  const { versions, retired } = await discoverVersions(RUN.core, RUN.cutoff);

  RUN.versions = versions;
  RUN.retired = retired;

  log.push(["versions", RUN.versions]);
  log.push(["retired", RUN.retired]);
});

await executeWithErrorHandling(`Nuke retired version content`, async log => {
  for (const majmin of RUN.retired) {
    // Clean up Starlight content directories
    const contentGlob = `${RUN.site}/src/content/docs/v${majmin}.*`;
    // Clean up static assets if they exist
    const staticGlob = `${RUN.site}/public/assets/v${majmin}.*`;

    const contentDirs = await glob(contentGlob);
    const staticDirs = await glob(staticGlob);

    for (const dirPath of contentDirs) {
      await fs.rm(dirPath, { recursive: true, force: true });
      log.push(["content", `removed v${majmin} content: ${dirPath}`]);
    }

    for (const dirPath of staticDirs) {
      await fs.rm(dirPath, { recursive: true, force: true });
      log.push(["static", `removed v${majmin} assets: ${dirPath}`]);
    }
  }
});

// Check if version should be skipped (already built). Always rebuilds 'latest' to ensure freshness
async function shouldSkipVersion(version, verdir) {
  const found = await fs
    .stat(verdir)
    .then(s => s.isDirectory())
    .catch(() => false);

  // Always rebuild latest/main
  if (found && version === "latest") {
    await fs.rm(verdir, { recursive: true, force: true });
    return false;
  }

  return found;
}

// Create version directory
const createVersionDirectory = verdir =>
  executeWithErrorHandling(`Create version dir`, async log => {
    await fs.mkdir(verdir, { recursive: true });
    log.push(["dir", verdir]);
  });

// Checkout the appropriate git version
async function checkoutCoreVersion(core, version) {
  await executeWithErrorHandling(`Checkout core version`, async log => {
    const checkoutTarget = version === "latest" ? "main" : version;
    await exec(`git checkout ${checkoutTarget}`, { cwd: core });

    let result =
      version === "latest"
        ? await exec("git branch --show-current", { cwd: core })
        : await exec("git describe --tags", { cwd: core });

    result = result.stdout.trim();

    log.push(["repo", core]);
    version === "latest" ? log.push(["branch", result]) : log.push(["tag", result]);
  });
}

// Find and filter source documentation files
async function findSourceDocFiles(coredocs) {
  let srcmds = [];

  await executeWithErrorHandling(`Find source doc files`, async log => {
    let sources = await fs.readdir(coredocs, { recursive: true });

    // Process only .md files, but not non-root README.md
    srcmds = sources.filter(f => f.endsWith(".md")).filter(f => !(f === "README.md"));

    const srcign = sources.filter(s => !srcmds.includes(s));

    log.push(["sources", srcmds]);
    log.push(["ignored", srcign]);
  });

  return srcmds;
}

// Copy repository images
const copyRepoImages = (core, tmp, version) =>
  executeWithErrorHandling(`Copy repo images`, async log => {
    const [src, dst] = [`${core}/_images`, `${tmp}/static/${version}/_images`];
    await fs.cp(src, dst, { recursive: true });
    log.push(["src", src], ["dst", dst]);
  });

// Copy repository resources
async function copyRepoResources(core, tmp, version) {
  await executeWithErrorHandling(`Copy repo resources`, async log => {
    const srcresources = `${core}/docs`;
    const dstresources = `${tmp}/static/${version}`;

    // Copy all resource directories from docs
    const resourceDirs = await glob(`${srcresources}/**/resources`, {
      onlyDirectories: true,
    });

    for (const resourceDir of resourceDirs) {
      const relativePath = path.relative(srcresources, resourceDir);
      const dstPath = path.join(dstresources, relativePath);
      await fs.mkdir(path.dirname(dstPath), { recursive: true });
      await fs.cp(resourceDir, dstPath, { recursive: true });
      log.push(["copied", `${resourceDir} -> ${dstPath}`]);
    }
  });
}


// Process root level markdown files (community files)
const processRootMarkdownFiles = async (core, version) => {
  const processedFiles = [];

  await executeWithErrorHandling("Process root level markdown files", async () => {
    for (const { sources, target } of ROOT_MD_MAPPINGS) {
      // Try each source variant until one is found
      let found = false;
      for (const srcFile of sources) {
        const srcPath = `${core}/${srcFile}`;
        if (
          await fs
            .stat(srcPath)
            .then(() => true)
            .catch(() => false)
        ) {
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.copyFile(srcPath, target);
          processedFiles.push(target);
          found = true;
          break; // Stop checking other variants once we find one
        }
      }
    }
  });

  return processedFiles;
};

// Determine source path for a file (handles special community files).
// Needed for backward compatibility with old git tags (v1.0.2, v0.55.6)
const getSourcePath = (file, coredocs) => {
  // Derive the list of root markdown file targets from ROOT_MD_MAPPINGS to avoid duplication
  const rootMarkdownTargets = ROOT_MD_MAPPINGS.map(m => m.target);
  return rootMarkdownTargets.some(cf => file.endsWith(cf)) ? file : `${coredocs}/${file}`;
};


// Process a single source file
const processSingleSourceFile = async (file, coredocs, verdir) => {
  const src = getSourcePath(file, coredocs);
  const content = await fs.readFile(src, "utf8");
  const { newfile } = generateFileMetadata(file);
  const { front, contentWithoutHeading } = generateFrontMatter(content, newfile, RUN.version, file);
  const processedContent = processContentLinks([front, contentWithoutHeading].join("\n"), file);

  await fs.mkdir(`${verdir}/${path.dirname(newfile)}`, { recursive: true });
  await fs.writeFile(`${verdir}/${newfile}`, processedContent, "utf8");
};

// Write version layout and landing content
const writeVersionLandingPage = async (version, verdir, core) => {
  await executeWithErrorHandling(`Write version layout & landing content`, async log => {
    const idxMd = `${verdir}/index.md`;
    const slugField =
      version !== "latest" ? `slug: ${version.replace(/^v(\d+\.\d+)\.\d+$/, "v$1")}` : "";

    const idxFront = heredoc`
			---
			title: Pepr
			description: Pepr Documentation - ${version}${slugField ? `\n			${slugField}` : ""}
			---
		`;

    let idxBody = await fs.readFile(`${core}/README.md`, "utf8");
    const headings = idxBody.match(/#[\s]+(.*)/);
    idxBody = idxBody.replaceAll(headings[0], "").replaceAll("](./docs/", "](./");

    idxBody = transformContent(idxBody).replaceAll(".md)", "/");

    await fs.writeFile(idxMd, [idxFront, idxBody].join("\n"), "utf8");
    log.push(["dst", idxMd]);
  });
};

// Process each version
for (const version of RUN.versions) {
  RUN.version = version;
  RUN.verdir = `${RUN.tmp}/content/${RUN.version}`;
  RUN.coredocs = `${RUN.core}/docs`;

  // Check if version should be skipped
  if (await shouldSkipVersion(RUN.version, RUN.verdir)) {
    console.log(`Skipping ${RUN.version} - already built`);
    continue;
  }

  console.log(`Processing version ${RUN.version}...`);

  // Set up version infrastructure
  await createVersionDirectory(RUN.verdir);
  await checkoutCoreVersion(RUN.core, RUN.version);
  RUN.srcmds = await findSourceDocFiles(RUN.coredocs);
  await copyRepoImages(RUN.core, RUN.tmp, RUN.version);
  await copyRepoResources(RUN.core, RUN.tmp, RUN.version);

  // Process root markdown files and add them to source files list
  const rootMarkdownFiles = await processRootMarkdownFiles(RUN.core, RUN.version);
  if (!RUN.srcmds) RUN.srcmds = [];
  if (rootMarkdownFiles && Array.isArray(rootMarkdownFiles)) {
    RUN.srcmds.push(...rootMarkdownFiles);
  }

  // Process all source files in parallel
  await Promise.all(
    RUN.srcmds.map(srcmd => processSingleSourceFile(srcmd, RUN.coredocs, RUN.verdir)),
  );

  // Write version landing page
  await writeVersionLandingPage(RUN.version, RUN.verdir, RUN.core);
}

await executeWithErrorHandling(`Process all tmp directory content`, async log => {
  // Process all content in tmp directory to fix image paths
  console.log("Processing tmp directory content (fixing image paths)...");
  const workContentDirs = await glob(`${RUN.tmp}/content/*`, { onlyDirectories: true });

  // Process all version directories in parallel
  await Promise.all(
    workContentDirs.map(async workDir => {
      const version = path.basename(workDir);
      console.log(`Processing tmp content for version: ${version}`);
      await processAllContent(workDir);
    }),
  );

  log.push(["processed", workContentDirs.length + " version directories"]);
});

await executeWithErrorHandling(`Set current version alias`, async log => {
  // Find the latest stable version using the shared utility
  const currentVersion = findCurrentVersion(RUN.versions);
  if (!currentVersion) {
    log.push(["current", "no stable versions found"]);
    return;
  }

  const currentMajMin = currentVersion.replace(/^v(\d+\.\d+)\.\d+$/, "v$1");

  // Create a "current" symlink/copy pointing to the latest stable version
  const currentDir = `${RUN.site}/src/content/docs/current`;
  const targetDir = `${RUN.site}/src/content/docs/v${currentMajMin}`;

  // Remove existing current directory if it exists
  try {
    await fs.rm(currentDir, { recursive: true, force: true });
  } catch (e) {
    // Directory might not exist, that's fine
  }

  // Check if target version directory exists
  if (
    await fs
      .stat(targetDir)
      .then(() => true)
      .catch(() => false)
  ) {
    // Copy the content instead of symlink for better compatibility
    await fs.cp(targetDir, currentDir, { recursive: true });
    log.push(["current", `v${currentMajMin} (${currentVersion})`]);
    log.push(["target", targetDir]);
    log.push(["alias", currentDir]);
  } else {
    log.push(["error", `target version directory not found: ${targetDir}`]);
  }
});

// Process pepr-excellent-examples
await executeWithErrorHandling(`Process pepr-excellent-examples`, async log => {
  console.log("Processing pepr-excellent-examples repository...");

  const examplesRepo = path.resolve(opts.examples);
  const examplesDir = `${RUN.tmp}/content/latest/examples`;

  // Ensure examples directory exists
  await fs.mkdir(examplesDir, { recursive: true });

  // Find all hello-pepr-* directories
  const exampleDirs = await glob(`${examplesRepo}/hello-pepr-*`, { onlyDirectories: true });

  console.log(`Found ${exampleDirs.length} example directories`);

  // Process each example directory
  await Promise.all(
    exampleDirs.map(async exampleDir => {
      const exampleName = path.basename(exampleDir);
      const readmePath = path.join(exampleDir, "README.md");

      // Check if README exists
      try {
        await fs.access(readmePath);
      } catch {
        console.warn(`No README.md found in ${exampleName}, skipping`);
        return;
      }

      // Read and transform content
      let content = await fs.readFile(readmePath, "utf8");

      // Extract title from first heading or use directory name
      const headingMatch = content.match(/^#\s+(.+)$/m);
      let title = headingMatch
        ? headingMatch[1]
        : exampleName.replace(/^hello-pepr-/, "").replace(/-/g, " ");

      // Remove "Hello Pepr " prefix from title (case-insensitive)
      title = title.replace(/^hello\s+pepr\s+/i, "");

      // Remove the first heading if it exists (we'll use frontmatter title)
      if (headingMatch) {
        content = content.replace(/^#\s+.+$/m, "").trim();
      }

      // Transform content (fix paths, links, etc.)
      content = transformContent(content);

      // Create a clean slug from the example name (remove hello-pepr- prefix)
      const slug = exampleName.replace(/^hello-pepr-/, "");

      // Helper to escape double quotes and backslashes for YAML quoted strings
      function escapeYamlString(str) {
        return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      }

      // GitHub source URL
      const sourceUrl = `https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/${exampleName}`;

      // Generate frontmatter (quote values to handle special YAML characters like colons)
      const frontmatter = heredoc`
        ---
        title: "${escapeYamlString(title)}"
        description: "${escapeYamlString(title)}"
        ---
      `;

      // Add source link at the top of content
      const sourceLink = `\n\n> **Source:** [${exampleName}](${sourceUrl})\n\n`;

      // Write the processed file
      const outputPath = path.join(examplesDir, `${slug}.md`);
      await fs.writeFile(outputPath, frontmatter + sourceLink + content, "utf8");

      log.push(["processed", `${exampleName} -> examples/${slug}.md`]);
    }),
  );

  log.push(["total", `${exampleDirs.length} examples processed`]);
});

// Starlight sidebar configuration template
const STARLIGHT_SIDEBAR_CONFIG = {
  sidebar: [
    { label: "User Guide", autogenerate: { directory: "user-guide" } },
    { label: "Actions", autogenerate: { directory: "actions" } },
    { label: "Tutorials", autogenerate: { directory: "tutorials" } },
    { label: "Reference", autogenerate: { directory: "reference" } },
    { label: "Community and Support", autogenerate: { directory: "community" } },
    { label: "Contribute", autogenerate: { directory: "contribute" } },
    { label: "Examples", autogenerate: { directory: "examples" } },
    { label: "Roadmap for Pepr", link: "roadmap" },
  ],
};

// Check if a path exists and is accessible
const pathExists = async path =>
  fs
    .stat(path)
    .then(() => true)
    .catch(() => false);

// Check if version directory has markdown content
const hasMarkdownContent = async versionPath => {
  try {
    const files = await fs.readdir(versionPath, { recursive: true });
    return files.some(f => f.endsWith(".md"));
  } catch {
    return false;
  }
};

// Helper function to copy images from a version
const copyImagesFromVersion = async (version, publicDir) => {
  const imagesPath = `${RUN.tmp}/static/${version}/_images`;
  if (await pathExists(imagesPath)) {
    console.log(`Copying images from ${imagesPath} to assets directory`);
    const imageFiles = await fs.readdir(imagesPath);
    await Promise.all(
      imageFiles.map(async imageFile => {
        try {
          await fs.cp(
            path.join(imagesPath, imageFile),
            path.join(`${publicDir}/assets`, imageFile),
          );
        } catch (e) {
          console.warn(`Failed to copy image ${imageFile}: ${e.message}`);
        }
      }),
    );
    console.log(`Copied ${imageFiles.length} images from version ${version}`);
    return true;
  }
  return false;
};

// Helper function to copy resources from a version
// Path needed for backward compatibility for versions 1.0.2 and below
const copyResourcesFromVersion = async (version, siteRoot) => {
  const resourcesPath = `${RUN.tmp}/static/${version}/040_pepr-tutorials/resources`;
  if (await pathExists(resourcesPath)) {
    console.log(`Copying resources from ${resourcesPath} to src directories`);
    await fs.mkdir(`${siteRoot}/src/content/docs/resources`, { recursive: true });

    const resourceSubdirs = await fs.readdir(resourcesPath, { withFileTypes: true });
    const directoriesOnly = resourceSubdirs.filter(dirent => dirent.isDirectory());

    await Promise.all(
      directoriesOnly.map(async dirent => {
        try {
          const srcDir = path.join(resourcesPath, dirent.name);
          const dstDir = path.join(`${siteRoot}/src/content/docs/resources`, dirent.name);
          await fs.cp(srcDir, dstDir, { recursive: true });
          console.log(`Copied ${srcDir} -> ${dstDir}`);
        } catch (e) {
          console.warn(`Failed to copy resource directory ${dirent.name}: ${e.message}`);
        }
      }),
    );
    console.log(`Copied ${directoriesOnly.length} resource directories from version ${version}`);
    return true;
  }
  return false;
};

// Helper function to execute Astro build and handle dist copying
const executeBuild = async (siteRoot, targetDist) => {
  console.log(`Building Starlight site from directory: ${siteRoot}`);

  try {
    const buildResult = await util.promisify(child_process.execFile)(
      "node",
      ["node_modules/.bin/astro", "build"],
      {
        cwd: siteRoot,
        maxBuffer: 1024 * 1024 * 10,
      },
    );

    console.log("Build completed successfully");
    if (buildResult.stderr) {
      console.log("Build warnings:", buildResult.stderr);
    }

    const astroDist = `${siteRoot}/dist`;
    const astroDistExists = await pathExists(astroDist);

    if (!astroDistExists) {
      throw new Error(`Astro build did not produce expected output directory: ${astroDist}`);
    }

    if (path.resolve(astroDist) !== path.resolve(targetDist)) {
      await fs.rm(targetDist, { recursive: true, force: true });
      await fs.mkdir(path.dirname(targetDist), { recursive: true });
      await fs.cp(astroDist, targetDist, { recursive: true });
      console.log(`Successfully copied built site from ${astroDist} to ${targetDist}`);
    } else {
      console.log(`Build output is already in target location: ${targetDist}`);
    }

    return buildResult;
  } catch (error) {
    console.error("Build failed:", error.message);
    if (error.stdout) console.error("Build stdout:", error.stdout);
    if (error.stderr) console.error("Build stderr:", error.stderr);
    throw error;
  }
};

// Auto-generate version JSON config files for starlight-versions
await executeWithErrorHandling(`Generate version configuration files`, async log => {
  console.log("Auto-generating version configuration files...");
  const stableVersions = getStableVersions(RUN.versions);
  const siteRoot = path.dirname(path.dirname(path.dirname(RUN.site)));
  const versionsDir = `${siteRoot}/src/content/versions`;

  await fs.rm(versionsDir, { recursive: true, force: true });
  await fs.mkdir(versionsDir, { recursive: true });

  for (const version of stableVersions) {
    const versionMajMin = version.replace(/^v(\d+\.\d+)\.\d+$/, "v$1");
    const versionContentPath = `${RUN.tmp}/content/${version}`;

    if (await hasMarkdownContent(versionContentPath)) {
      await fs.writeFile(
        `${versionsDir}/${versionMajMin}.json`,
        JSON.stringify(STARLIGHT_SIDEBAR_CONFIG, null, 2),
      );
      log.push(["generated", `${versionMajMin}.json`]);
    } else {
      log.push(["skipped", `${versionMajMin} (no content)`]);
    }
  }
});

await executeWithErrorHandling(`Generate Netlify _redirects file`, async log => {
  const siteRoot = path.dirname(path.dirname(path.dirname(RUN.site)));
  const publicDir = `${siteRoot}/public`;
  const netlifyRedirectsFile = `${publicDir}/_redirects`;

  const results = await generateNetlifyRedirects({
    coreRepoPath: RUN.core,
    retiredVersions: RUN.retired,
    activeVersions: RUN.versions,
    outputPath: netlifyRedirectsFile,
  });

  log.push(["generated", "_redirects (Netlify)"]);
  log.push(["total", `${results.totalRules} redirect rules`]);
  log.push(["retired", `${results.retiredCount} retired version redirects`]);
  log.push(["manual", `${results.manualCount} manual redirects`]);
  log.push(["patch", `${results.patchCount} patch-to-minor redirects`]);
});

// Generate final distribution build by copying processed content to Starlight directories
// and running the Astro build process to create the static site
if (opts.dist) {
  await executeWithErrorHandling(`Clean dist dir`, async log => {
    RUN.dist = path.resolve(`./dist`);
    await fs.rm(RUN.dist, { recursive: true, force: true });
    await fs.mkdir(RUN.dist);

    log.push(["dist", RUN.dist]);
  });

  await executeWithErrorHandling(`Build Starlight site into dist dir`, async () => {
    const siteRoot = path.dirname(path.dirname(path.dirname(RUN.site)));
    const starlightContentDir = `${siteRoot}/src/content/docs`;
    const publicDir = `${siteRoot}/public`;

    // Prepare directories
    await fs.rm(starlightContentDir, { recursive: true, force: true });
    await fs.mkdir(starlightContentDir, { recursive: true });
    await fs.rm(`${siteRoot}/src/content/docs/resources`, { recursive: true, force: true });
    await fs.mkdir(`${publicDir}/assets`, { recursive: true });

    console.log("Copying images and resources to src and public directories...");

    // Copy assets from first available version (images and resources)
    let assetsCopied = false;
    for (const version of RUN.versions) {
      const imagesCopied = await copyImagesFromVersion(version, publicDir);
      const resourcesCopied = await copyResourcesFromVersion(version, siteRoot);

      if (imagesCopied || resourcesCopied) {
        console.log(`Assets copied from version: ${version}`);
        assetsCopied = true;
        break;
      }
    }

    if (!assetsCopied) {
      console.log("Warning: No images or resources found to copy");
    }

    // Copy main version content to unversioned location (current/latest)
    if (await pathExists(`${RUN.tmp}/content/latest`)) {
      await fs.cp(`${RUN.tmp}/content/latest`, starlightContentDir, { recursive: true });
    }

    // Copy resource images to assets directory
    const resourceImages = await glob(`${siteRoot}/src/content/docs/resources/**/*.png`);
    if (resourceImages.length > 0) {
      console.log(`Copying ${resourceImages.length} resource images to assets directory...`);
      await Promise.all(
        resourceImages.map(async resourceImage => {
          try {
            const imageName = path.basename(resourceImage);
            await fs.cp(resourceImage, `${publicDir}/assets/${imageName}`);
          } catch (e) {
            console.warn(
              `Failed to copy resource image ${path.basename(resourceImage)}: ${e.message}`,
            );
          }
        }),
      );
    }

    // Copy stable version content
    const stableVersions = getStableVersions(RUN.versions);
    console.log(`Processing discovered stable versions: ${stableVersions.join(", ")}`);

    await Promise.all(
      stableVersions.map(async version => {
        try {
          const versionContentPath = `${RUN.tmp}/content/${version}`;
          const versionMajMin = version.replace(/^v(\d+\.\d+)\.\d+$/, "v$1");
          const starlightVersionDir = `${siteRoot}/src/content/docs/${versionMajMin}`;

          if (await pathExists(versionContentPath)) {
            console.log(`Processing version ${version}...`);
            await fs.mkdir(starlightVersionDir, { recursive: true });
            await fs.cp(versionContentPath, starlightVersionDir, { recursive: true });
          }
        } catch (e) {
          console.warn(`Failed to process version ${version}: ${e.message}`);
        }
      }),
    );

    // Execute Astro build
    await executeBuild(siteRoot, RUN.dist);
  });
}

console.timeEnd(TOTAL);
console.log("");
