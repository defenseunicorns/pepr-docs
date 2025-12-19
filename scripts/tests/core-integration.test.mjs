import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import { ROOT_MD_MAPPINGS } from "../lib/root-mappings.mjs";
import { generateFileMetadata } from "../lib/file-metadata.mjs";
import { generateFrontMatter } from "../lib/frontmatter.mjs";

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
    it("should configure SECURITY.md to route to community directory", () => {
      const securityMapping = ROOT_MD_MAPPINGS.find(m => m.sources.includes("SECURITY.md"));

      expect(securityMapping).toBeDefined();
      expect(securityMapping.target).toBe("090_community/security.md");
      expect(securityMapping.target).toContain("community/");
    });

    it("should configure CODE-OF-CONDUCT.md to route to contribute directory", () => {
      const conductMapping = ROOT_MD_MAPPINGS.find(m => m.sources.includes("CODE-OF-CONDUCT.md"));

      expect(conductMapping).toBeDefined();
      expect(conductMapping.target).toBe("100_contribute/code-of-conduct.md");
      expect(conductMapping.target).toContain("contribute/");
    });

    it("should configure SUPPORT.md to route to community directory", () => {
      const supportMapping = ROOT_MD_MAPPINGS.find(m => m.sources.includes("SUPPORT.md"));

      expect(supportMapping).toBeDefined();
      expect(supportMapping.target).toBe("090_community/support.md");
      expect(supportMapping.target).toContain("community/");
    });

    it("should place SECURITY.md in community/ not contribute/", () => {
      const securityMapping = ROOT_MD_MAPPINGS.find(m => m.sources.includes("SECURITY.md"));
      const conductMapping = ROOT_MD_MAPPINGS.find(m => m.sources.includes("CODE-OF-CONDUCT.md"));

      expect(securityMapping.target).toContain("community/");
      expect(conductMapping.target).toContain("contribute/");
      expect(securityMapping.target).not.toContain("contribute/");
    });
  });

  describe("File Processing with Metadata", () => {
    it("should strip numbered prefixes from directories", () => {
      const inputPath = "010_user-guide/getting-started.md";

      const result = generateFileMetadata(inputPath);

      expect(result.newfile).toBe("user-guide/getting-started.md");
    });

    it("should convert README.md to index.md", () => {
      const inputPath = "010_user-guide/README.md";

      const result = generateFileMetadata(inputPath);

      expect(result.newfile).toBe("user-guide/index.md");
    });

    it("should apply path structure mappings", async () => {
      const inputPath = "040_pepr-tutorials/getting-started.md";

      const result = generateFileMetadata(inputPath);

      expect(result.newfile).toBe("tutorials/getting-started.md");
    });
  });

  describe("Frontmatter Generation with Versions", () => {
    it("should generate frontmatter for latest version without slug", async () => {
      const content = "# Getting Started\n\nThis is the guide...";
      const version = "latest";
      const newfile = "user-guide/getting-started.md";

      const result = generateFrontMatter(content, newfile, version);

      expect(result.front).toContain("title: Getting Started");
      expect(result.front).not.toContain("slug:");
    });

    it("should generate frontmatter for versioned content with slug", async () => {
      const content = "# Getting Started\n\nThis is the guide...";
      const version = "v1.2.3";
      const newfile = "user-guide/getting-started.md";

      const result = generateFrontMatter(content, newfile, version);

      expect(result.front).toContain("slug: v1.2/user-guide/getting-started");
    });

    it("should generate Overview title for README files with sidebar label", async () => {
      const content = "# User Guide\n\nOverview content...";
      const newfile = "user-guide/index.md";
      const originalFile = "010_user-guide/README.md";

      const result = generateFrontMatter(content, newfile, "latest", originalFile);

      expect(result.front).toContain("title: Overview");
      expect(result.front).toContain("sidebar:");
      expect(result.front).toContain("label: Overview");
    });
  });

  describe("Content Transformation Pipeline", () => {
    it("should transform numbered paths and generate frontmatter in one pipeline", () => {
      const inputPath = "010_user-guide/070_getting-started.md";
      const sourceContent = "# Getting Started\n\nThis is a comprehensive guide...";

      const fileResult = generateFileMetadata(inputPath);
      const frontmatterResult = generateFrontMatter(sourceContent, fileResult.newfile, "latest");

      expect(fileResult.newfile).toBe("user-guide/getting-started.md");
      expect(frontmatterResult.front).toContain("title: Getting Started");
      expect(frontmatterResult.front).toContain("description: Getting Started");
      expect(frontmatterResult.contentWithoutHeading).toContain("This is a comprehensive guide...");
      expect(frontmatterResult.contentWithoutHeading).not.toContain("# Getting Started");
    });

    it.each([
      ["010_user-guide/README.md", "# User Guide\n\nContent...", "Overview"],
      ["040_tutorials/README.md", "# Tutorials\n\nContent...", "Overview"],
    ])(
      "should generate Overview title with sidebar label for README files: %s",
      (inputPath, sourceContent, expectedTitle) => {
        const fileResult = generateFileMetadata(inputPath);
        const frontmatterResult = generateFrontMatter(
          sourceContent,
          fileResult.newfile,
          "latest",
          inputPath,
        );

        expect(frontmatterResult.front).toContain(`title: ${expectedTitle}`);
        expect(frontmatterResult.front).toContain("sidebar:");
        expect(frontmatterResult.front).toContain("label: Overview");
      },
    );

    it.each([
      ["020_actions/mutate.md", "# Mutate\n\nContent...", "Mutate"],
    ])(
      "should use heading title without sidebar for regular files: %s",
      (inputPath, sourceContent, expectedTitle) => {
        const fileResult = generateFileMetadata(inputPath);
        const frontmatterResult = generateFrontMatter(
          sourceContent,
          fileResult.newfile,
          "latest",
          inputPath,
        );

        expect(frontmatterResult.front).toContain(`title: ${expectedTitle}`);
        expect(frontmatterResult.front).not.toContain("sidebar:");
      },
    );

    it.each([
      ["best-practices/README.md", "reference/best-practices.md"],
      ["module-examples/README.md", "reference/module-examples.md"],
      ["faq/README.md", "reference/faq.md"],
    ])("should map special directory %s to single file", async (inputPath, expectedOutput) => {
      const result = generateFileMetadata(inputPath);

      expect(result.newfile).toBe(expectedOutput);
    });
  });
});
