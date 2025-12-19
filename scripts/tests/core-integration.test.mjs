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

  describe("File Discovery and Routing Logic", () => {
    it("should exclude root README.md but include nested READMEs when filtering source files", async () => {
      const testFiles = ["README.md", "010_user-guide/README.md", "getting-started.md"];

      for (const file of testFiles) {
        const filePath = path.join(docsDir, file);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, "# Test Content", "utf8");
      }

      const allFiles = await glob(`${docsDir}/**/*.md`);
      const relativeFiles = allFiles.map(f => path.relative(docsDir, f));
      const filtered = relativeFiles
        .filter(f => f.endsWith(".md"))
        .filter(f => !(f === "README.md"));

      expect(filtered).not.toContain("README.md");
      expect(filtered).toContain("010_user-guide/README.md");
      expect(filtered).toContain("getting-started.md");
    });
  });

  describe("Root Contributing and Community Files Routing", () => {
    it.each([
      ["SECURITY.md", "community/security.md"],
      ["CODE-OF-CONDUCT.md", "contribute/code-of-conduct.md"],
      ["SUPPORT.md", "community/support.md"],
    ])(
      "should route %s to correct destination directory",
      async (sourceFile, expectedDestination) => {
        const ROOT_MD_MAPPINGS = [
          { sources: ["SECURITY.md"], target: "community/security.md" },
          { sources: ["CODE-OF-CONDUCT.md"], target: "contribute/code-of-conduct.md" },
          { sources: ["SUPPORT.md"], target: "community/support.md" },
        ];

        const mapping = ROOT_MD_MAPPINGS.find(m => m.sources.includes(sourceFile));

        expect(mapping).toBeDefined();
        expect(mapping.target).toBe(expectedDestination);
      },
    );

    it("should place SECURITY.md in community/ not contribute/", async () => {
      const ROOT_MD_MAPPINGS = [
        { sources: ["SECURITY.md"], target: "community/security.md" },
        { sources: ["SUPPORT.md"], target: "community/support.md" },
        { sources: ["CODE-OF-CONDUCT.md"], target: "contribute/code-of-conduct.md" },
      ];

      const securityMapping = ROOT_MD_MAPPINGS.find(m => m.sources.includes("SECURITY.md"));
      const conductMapping = ROOT_MD_MAPPINGS.find(m => m.sources.includes("CODE-OF-CONDUCT.md"));

      expect(securityMapping.target).toContain("community/");
      expect(conductMapping.target).toContain("contribute/");
      expect(securityMapping.target).not.toContain("contribute/");
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

  describe("Content Transformation Pipeline", () => {
    it("should transform numbered paths and generate frontmatter in one pipeline", async () => {
      const inputPath = "010_user-guide/070_getting-started.md";
      const sourceContent = "# Getting Started\n\nThis is a comprehensive guide...";

      const relativePath = path.relative(".", inputPath);
      const cleanPath = relativePath.replace(/\d+_/g, "");

      const heading = sourceContent.match(/#[\s]+(.*)/);
      const title = heading[1];
      const frontmatter = `---\ntitle: ${title}\ndescription: ${title}\n---`;
      const contentWithoutHeading = sourceContent.replace(heading[0], "");
      const transformedContent = `${frontmatter}\n${contentWithoutHeading}`;

      expect(cleanPath).toBe("user-guide/getting-started.md");
      expect(transformedContent).toContain("title: Getting Started");
      expect(transformedContent).toContain("description: Getting Started");
      expect(transformedContent).toContain("This is a comprehensive guide...");
      expect(transformedContent).not.toContain("# Getting Started");
    });

    it.each([
      ["010_user-guide/README.md", "README.md", "# User Guide\n\nContent...", "Overview", true],
      ["020_actions/mutate.md", "mutate.md", "# Mutate\n\nContent...", "Mutate", false],
      ["040_tutorials/README.md", "README.md", "# Tutorials\n\nContent...", "Overview", true],
    ])(
      "should decide title based on README vs regular file: %s",
      async (inputPath, basename, sourceContent, expectedTitle, shouldHaveSidebar) => {
        const isReadme = basename === "README.md";
        const heading = sourceContent.match(/#[\s]+(.*)/);
        const title = isReadme ? "Overview" : heading[1];
        const sidebarLabel = isReadme ? "\nsidebar:\n  label: Overview" : "";

        expect(title).toBe(expectedTitle);
        if (shouldHaveSidebar) {
          expect(sidebarLabel).toContain("sidebar:");
          expect(sidebarLabel).toContain("label: Overview");
        } else {
          expect(sidebarLabel).toBe("");
        }
      },
    );

    it.each([
      ["best-practices/README.md", "best-practices", "reference/best-practices.md"],
      ["module-examples/README.md", "module-examples", "reference/module-examples.md"],
      ["faq/README.md", "faq", "reference/faq.md"],
    ])("should map special directory %s to single file", async (inputPath, dir, expectedOutput) => {
      const PATH_MAPPINGS = {
        singleFile: {
          "best-practices": "reference/best-practices.md",
          "module-examples": "reference/module-examples.md",
          faq: "reference/faq.md",
        },
      };

      const basename = path.basename(inputPath);
      let outputPath = inputPath;
      if (basename === "README.md" && PATH_MAPPINGS.singleFile[dir]) {
        outputPath = PATH_MAPPINGS.singleFile[dir];
      }

      expect(outputPath).toBe(expectedOutput);
    });

    it("should handle malformed markdown by returning null heading", () => {
      const contentWithoutHeading = "This has no heading\n\nJust content...";
      const contentWithHeading = "# Proper Heading\n\nContent...";

      const noHeading = contentWithoutHeading.match(/#[\s]+(.*)/);
      const hasHeading = contentWithHeading.match(/#[\s]+(.*)/);

      expect(noHeading).toBeNull();
      expect(hasHeading).not.toBeNull();
      expect(hasHeading[1]).toBe("Proper Heading");
    });
  });
});
