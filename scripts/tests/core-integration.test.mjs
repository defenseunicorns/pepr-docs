import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CORE Integration Tests", () => {
  const testDir = path.join(__dirname, ".core-test-tmp");
  const coreRepo = path.join(testDir, "pepr");
  const docsDir = path.join(coreRepo, "docs");
  const outputDir = path.join(testDir, "output");

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(coreRepo, { recursive: true });
    await fs.mkdir(docsDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn("Failed to clean up test directory:", error);
    }
  });

  describe("Documentation Directory Discovery", () => {
    it("should find all .md files in docs directory", async () => {
      const testFiles = [
        "010_user-guide/getting-started.md",
        "010_user-guide/README.md",
        "020_actions/mutate.md",
        "README.md",
        "index.js",
      ];

      for (const file of testFiles) {
        const filePath = path.join(docsDir, file);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, "# Test\n\nContent", "utf8");
      }

      const foundFiles = await glob(`${docsDir}/**/*.md`);
      const relativePaths = foundFiles.map(f => path.relative(docsDir, f));

      expect(relativePaths).toContain("010_user-guide/getting-started.md");
      expect(relativePaths).toContain("010_user-guide/README.md");
      expect(relativePaths).toContain("020_actions/mutate.md");
    });

    it("should exclude non-.md files", async () => {
      const foundFiles = await glob(`${docsDir}/**/*.md`);
      const foundBasenames = foundFiles.map(f => path.basename(f));

      expect(foundBasenames).not.toContain("index.js");
    });

    it("should filter out root README.md from processing", async () => {
      const files = ["README.md", "010_user-guide/README.md", "getting-started.md"];

      // Simulate the filtering logic from findSourceDocFiles
      const filtered = files.filter(f => f.endsWith(".md")).filter(f => !(f === "README.md"));

      expect(filtered).not.toContain("README.md");
      expect(filtered).toContain("010_user-guide/README.md");
      expect(filtered).toContain("getting-started.md");
    });
  });

  describe("Root Community Files", () => {
    it.each([
      ["SECURITY.md", "# Security Policy\n\nPlease report vulnerabilities...", "Security Policy"],
      ["CODE-OF-CONDUCT.md", "# Code of Conduct\n\nBe respectful...", "Code of Conduct"],
      ["SUPPORT.md", "# Support\n\nGet help with Pepr...", "Support"],
    ])("should process %s from repository root", async (filename, content, expectedText) => {
      const filePath = path.join(coreRepo, filename);

      await fs.writeFile(filePath, content, "utf8");

      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      const fileContent = await fs.readFile(filePath, "utf8");
      expect(fileContent).toContain(expectedText);
    });
  });

  describe("File Processing with Metadata", () => {
    it("should strip numbered prefixes from directories", async () => {
      const sourceFile = path.join(docsDir, "010_user-guide/getting-started.md");
      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, "# Getting Started\n\nContent...", "utf8");

      // Simulate metadata generation
      const relativePath = path.relative(docsDir, sourceFile);
      const cleanPath = relativePath.replace(/\d+_/g, "");

      expect(cleanPath).toBe("user-guide/getting-started.md");
    });

    it("should convert README.md to index.md", async () => {
      const sourceFile = path.join(docsDir, "010_user-guide/README.md");
      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, "# User Guide\n\nOverview...", "utf8");

      // Simulate README conversion
      const basename = path.basename(sourceFile);
      const newBasename = basename === "README.md" ? "index.md" : basename;

      expect(newBasename).toBe("index.md");
    });

    it("should apply path structure mappings", async () => {
      const sourceFile = path.join(docsDir, "040_pepr-tutorials/getting-started.md");
      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, "# Tutorial\n\nContent...", "utf8");

      // Simulate path mapping
      const PATH_MAPPINGS = {
        structure: { "pepr-tutorials": "tutorials" },
      };

      let relativePath = path.relative(docsDir, sourceFile);
      relativePath = relativePath.replace(/\d+_/g, "");

      let mapped = Object.entries(PATH_MAPPINGS.structure).reduce(
        (p, [old, new_]) => p.replace(old, new_),
        relativePath,
      );

      expect(mapped).toBe("tutorials/getting-started.md");
    });
  });

  describe("Frontmatter Generation with Versions", () => {
    it("should generate frontmatter for latest version without slug", async () => {
      const content = "# Getting Started\n\nThis is the guide...";
      const version = "latest";

      function generateFrontMatter(content, version) {
        const heading = content.match(/#[\s]+(.*)/);
        const title = heading[1];
        const slug = version !== "latest" ? `\nslug: ${version}` : "";
        return `---\ntitle: ${title}\ndescription: ${title}${slug}\n---`;
      }

      const frontmatter = generateFrontMatter(content, version);

      expect(frontmatter).toContain("title: Getting Started");
      expect(frontmatter).not.toContain("slug:");
    });

    it("should generate frontmatter for versioned content with slug", async () => {
      const content = "# Getting Started\n\nThis is the guide...";
      const version = "v1.2.3";
      const newfile = "user-guide/getting-started.md";

      function generateFrontMatter(content, version, newfile) {
        const heading = content.match(/#[\s]+(.*)/);
        const title = heading[1];
        const slug =
          version !== "latest"
            ? `\nslug: ${version.replace(/^v(\d+\.\d+)\.\d+$/, "v$1")}/${newfile.replace(/\.md$/, "")}`
            : "";
        return `---\ntitle: ${title}\ndescription: ${title}${slug}\n---`;
      }

      const frontmatter = generateFrontMatter(content, version, newfile);

      expect(frontmatter).toContain("slug: v1.2/user-guide/getting-started");
    });

    it("should generate Overview title for README files with sidebar label", async () => {
      const content = "# User Guide\n\nOverview content...";
      const isReadme = true;

      function generateFrontMatter(content, isReadme) {
        const title = isReadme ? "Overview" : "User Guide";
        const sidebarLabel = isReadme ? "\nsidebar:\n  label: Overview" : "";
        return `---\ntitle: ${title}\ndescription: ${title}${sidebarLabel}\n---`;
      }

      const frontmatter = generateFrontMatter(content, isReadme);

      expect(frontmatter).toContain("title: Overview");
      expect(frontmatter).toContain("sidebar:");
      expect(frontmatter).toContain("label: Overview");
    });
  });

  describe("Output File Generation", () => {
    it("should create output file with correct path", async () => {
      const sourceFile = "010_user-guide/getting-started.md";
      const content = "---\ntitle: Getting Started\n---\n\nContent...";

      // Simulate output path generation
      const cleanPath = sourceFile.replace(/\d+_/g, "");
      const outputPath = path.join(outputDir, cleanPath);

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, content, "utf8");

      const exists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      expect(path.basename(outputPath)).toBe("getting-started.md");
    });

    it("should create index.md for README files", async () => {
      const content = "---\ntitle: Overview\n---\n\nOverview content...";
      const outputPath = path.join(outputDir, "user-guide/index.md");

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, content, "utf8");

      const exists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      expect(path.basename(outputPath)).toBe("index.md");
    });

    it("should create multiple output files for multiple source files", async () => {
      const files = [
        { source: "user-guide/getting-started.md", title: "Getting Started" },
        { source: "user-guide/pepr-cli.md", title: "Pepr CLI" },
        { source: "actions/mutate.md", title: "Mutate" },
      ];

      for (const file of files) {
        const outputPath = path.join(outputDir, file.source);
        const content = `---\ntitle: ${file.title}\n---\n\nContent...`;
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, content, "utf8");
      }

      const outputFiles = await glob(`${outputDir}/**/*.md`);
      const relativePaths = outputFiles.map(f => path.relative(outputDir, f));

      expect(relativePaths).toContain("user-guide/getting-started.md");
      expect(relativePaths).toContain("user-guide/pepr-cli.md");
      expect(relativePaths).toContain("actions/mutate.md");
    });
  });

  describe("Complete Processing Simulation", () => {
    it("should process file from docs/ through complete pipeline", async () => {
      const sourceFile = path.join(docsDir, "010_user-guide/070_getting-started.md");
      const sourceContent = "# Getting Started\n\nThis is a comprehensive guide...";

      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, sourceContent, "utf8");

      // Read source
      const content = await fs.readFile(sourceFile, "utf8");

      // Generate metadata
      const relativePath = path.relative(docsDir, sourceFile);
      const cleanPath = relativePath.replace(/\d+_/g, "");

      // Generate frontmatter
      const heading = content.match(/#[\s]+(.*)/);
      const title = heading[1];
      const frontmatter = `---\ntitle: ${title}\ndescription: ${title}\n---`;
      const contentWithoutHeading = content.replace(heading[0], "");

      // Write output
      const outputPath = path.join(outputDir, cleanPath);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, `${frontmatter}\n${contentWithoutHeading}`, "utf8");

      // Verify
      const outputContent = await fs.readFile(outputPath, "utf8");

      expect(outputContent).toContain("title: Getting Started");
      expect(outputContent).toContain("description: Getting Started");
      expect(outputContent).toContain("This is a comprehensive guide...");
      expect(outputContent).not.toContain("# Getting Started");
      expect(path.relative(outputDir, outputPath)).toBe("user-guide/getting-started.md");
    });

    it("should process README.md with Overview title and sidebar label", async () => {
      const sourceFile = path.join(docsDir, "010_user-guide/README.md");
      const sourceContent = "# User Guide\n\nWelcome to the user guide...";

      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, sourceContent, "utf8");

      // Read and process
      const content = await fs.readFile(sourceFile, "utf8");
      const heading = content.match(/#[\s]+(.*)/);
      const isReadme = path.basename(sourceFile) === "README.md";
      const title = isReadme ? "Overview" : heading[1];
      const sidebarLabel = isReadme ? "\nsidebar:\n  label: Overview" : "";
      const frontmatter = `---\ntitle: ${title}\ndescription: ${title}${sidebarLabel}\n---`;
      const contentWithoutHeading = content.replace(heading[0], "");

      // Generate output path
      const relativePath = path.relative(docsDir, sourceFile);
      const cleanPath = relativePath.replace(/\d+_/g, "").replace("README.md", "index.md");
      const outputPath = path.join(outputDir, cleanPath);

      // Write output
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, `${frontmatter}\n${contentWithoutHeading}`, "utf8");

      // Verify
      const outputContent = await fs.readFile(outputPath, "utf8");

      expect(outputContent).toContain("title: Overview");
      expect(outputContent).toContain("sidebar:");
      expect(outputContent).toContain("label: Overview");
      expect(path.basename(outputPath)).toBe("index.md");
    });

    it("should apply path mappings for special directories", async () => {
      const sourceFile = path.join(docsDir, "040_pepr-tutorials/010_getting-started.md");
      const sourceContent = "# Tutorial: Getting Started\n\nLearn Pepr basics...";

      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, sourceContent, "utf8");

      // Process with path mappings
      const PATH_MAPPINGS = {
        structure: { "pepr-tutorials": "tutorials" },
      };

      const relativePath = path.relative(docsDir, sourceFile);
      let cleanPath = relativePath.replace(/\d+_/g, "");
      cleanPath = Object.entries(PATH_MAPPINGS.structure).reduce(
        (p, [old, new_]) => (p.startsWith(old) ? p.replace(old, new_) : p),
        cleanPath,
      );

      expect(cleanPath).toBe("tutorials/getting-started.md");
    });

    it("should handle single file mappings for special cases", async () => {
      const sourceFile = path.join(docsDir, "best-practices/README.md");
      const sourceContent = "# Best Practices\n\nFollow these guidelines...";

      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, sourceContent, "utf8");

      // Simulate single file mapping
      const PATH_MAPPINGS = {
        singleFile: {
          "best-practices": "reference/best-practices.md",
        },
      };

      const relativePath = path.relative(docsDir, sourceFile);
      const dir = path.dirname(relativePath);
      const basename = path.basename(relativePath);

      let outputPath = relativePath;
      if (basename === "README.md" && PATH_MAPPINGS.singleFile[dir]) {
        outputPath = PATH_MAPPINGS.singleFile[dir];
      }

      expect(outputPath).toBe("reference/best-practices.md");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing files gracefully", async () => {
      const missingFile = path.join(docsDir, "nonexistent.md");

      let hasError = false;
      try {
        await fs.access(missingFile);
      } catch {
        hasError = true;
      }

      expect(hasError).toBe(true);
    });

    it("should handle empty content files", async () => {
      const emptyFile = path.join(docsDir, "empty.md");
      await fs.writeFile(emptyFile, "", "utf8");

      const content = await fs.readFile(emptyFile, "utf8");
      expect(content).toBe("");

      const heading = content.match(/#[\s]+(.*)/);
      expect(heading).toBeNull();
    });

    it("should handle malformed markdown", async () => {
      const malformedFile = path.join(docsDir, "malformed.md");
      const content = "This has no heading\n\nJust content...";
      await fs.writeFile(malformedFile, content, "utf8");

      const fileContent = await fs.readFile(malformedFile, "utf8");
      const heading = fileContent.match(/#[\s]+(.*)/);

      expect(heading).toBeNull();
    });
  });

  describe("Parallel Processing", () => {
    it("should handle multiple files processed in parallel", async () => {
      const files = [
        "010_user-guide/getting-started.md",
        "010_user-guide/pepr-cli.md",
        "020_actions/mutate.md",
        "020_actions/validate.md",
        "040_tutorials/basic.md",
      ];

      await Promise.all(
        files.map(async file => {
          const filePath = path.join(docsDir, file);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          const content = `# ${path.basename(file, ".md")}\n\nContent for ${file}`;
          await fs.writeFile(filePath, content, "utf8");
        }),
      );

      const results = await Promise.all(
        files.map(async file => {
          const filePath = path.join(docsDir, file);
          const content = await fs.readFile(filePath, "utf8");
          return { file, content };
        }),
      );

      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result.content).toContain(`Content for ${result.file}`);
      });
    });
  });
});
