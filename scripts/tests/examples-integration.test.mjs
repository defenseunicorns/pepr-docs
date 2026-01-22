import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import { generateExamplesSidebarItems } from "../lib/generate-examples-sidebar.mjs";
import {
  extractExampleCategory,
  removeHeading,
  generateExampleSlug,
  escapeYamlString,
  generateExampleSourceUrl,
} from "../lib/examples-processing.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("EXAMPLES Integration Tests", () => {
  const testDir = path.join(__dirname, ".examples-test-tmp");
  const examplesRepo = path.join(testDir, "pepr-excellent-examples");
  const outputDir = path.join(testDir, "output");

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(examplesRepo, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn("Failed to clean up test directory:", error);
    }
  });

  describe("Example Directory Pattern Matching", () => {
    it("should match hello-pepr-* pattern and exclude non-matching directories", async () => {
      const exampleDirs = [
        "hello-pepr-audit-logging",
        "hello-pepr-mutation",
        "hello-pepr-validation",
        "other-example",
        "hello-pepr-advanced-test",
      ];
      for (const dir of exampleDirs) {
        await fs.mkdir(path.join(examplesRepo, dir), { recursive: true });
      }

      const foundDirs = await glob(`${examplesRepo}/hello-pepr-*`, {
        onlyDirectories: true,
      });
      const foundBasenames = foundDirs.map(dir => path.basename(dir)).sort();

      expect(foundBasenames).toContain("hello-pepr-audit-logging");
      expect(foundBasenames).toContain("hello-pepr-mutation");
      expect(foundBasenames).toContain("hello-pepr-validation");
      expect(foundBasenames).toContain("hello-pepr-advanced-test");
      expect(foundBasenames).not.toContain("other-example");
      expect(foundDirs.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Category Extraction from H1 Heading", () => {
    it("should extract category and title when H1 has colon format", () => {
      const content = "# Action: Mutate\n\nThis example mutates resources.";
      const exampleName = "hello-pepr-mutate";
      const result = extractExampleCategory(content, exampleName);

      expect(result.category).toBe("action");
      expect(result.categoryLabel).toBe("Action");
      expect(result.title).toBe("Mutate");
    });

    it("should handle multi-word categories with colon format", () => {
      const content = "# My Custom Category: Example Title\n\nContent here.";
      const exampleName = "hello-pepr-example";
      const result = extractExampleCategory(content, exampleName);

      expect(result.category).toBe("my custom category");
      expect(result.categoryLabel).toBe("My Custom Category");
      expect(result.title).toBe("Example Title");
    });

    it("should mark as unnested when H1 has no colon", () => {
      const content = "# Alias\n\nThis example shows alias usage.";
      const exampleName = "hello-pepr-alias";
      const result = extractExampleCategory(content, exampleName);

      expect(result.category).toBe("other");
      expect(result.categoryLabel).toBe("Other");
      expect(result.title).toBe("Alias");
    });

    it("should use directory name as fallback when no H1 exists", () => {
      const content = "This example has no heading.\n\nJust content.";
      const exampleName = "hello-pepr-no-heading";
      const result = extractExampleCategory(content, exampleName);

      expect(result.category).toBe("other");
      expect(result.title).toBe("no heading");
    });

    it("should handle various colon formats consistently", () => {
      const testCases = [
        {
          content: "# Filter Options: Deletion Timestamp",
          expectedCategory: "filter options",
          expectedTitle: "Deletion Timestamp",
        },
        {
          content: "# Store: Redact Logs",
          expectedCategory: "store",
          expectedTitle: "Redact Logs",
        },
        {
          content: "# Configuration: RBAC",
          expectedCategory: "configuration",
          expectedTitle: "RBAC",
        },
      ];

      for (const testCase of testCases) {
        const result = extractExampleCategory(testCase.content, "hello-pepr-test");

        expect(result.category).toBe(testCase.expectedCategory);
        expect(result.title).toBe(testCase.expectedTitle);
      }
    });
  });

  describe("Heading Removal", () => {
    it("should remove H1 heading from content", () => {
      const readmeContent = "# Full Test Example\n\nThis is the content...";
      const contentWithoutHeading = removeHeading(readmeContent);

      expect(contentWithoutHeading).toBe("This is the content...");
      expect(contentWithoutHeading).not.toContain("# Full Test Example");
    });

    it("should preserve content when no heading exists", () => {
      const readmeContent = "This example has no heading.\n\nJust content.";
      const contentWithoutHeading = removeHeading(readmeContent);

      expect(contentWithoutHeading).toBe("This example has no heading.\n\nJust content.");
    });
  });

  describe("Slug Generation", () => {
    it.each([
      ["hello-pepr-audit-logging", "audit-logging"],
      ["hello-pepr-mutation", "mutation"],
      ["hello-pepr-validation", "validation"],
      ["hello-pepr-advanced-test", "advanced-test"],
      ["hello-pepr-load", "load"],
      ["hello-pepr", "module"],
    ])("should generate slug from example name: %s -> %s", (exampleName, expectedSlug) => {
      const slug = generateExampleSlug(exampleName);

      expect(slug).toBe(expectedSlug);
    });
  });

  describe("YAML Frontmatter Escaping", () => {
    it.each([
      ['Example: "Test" & More', 'Example: \\"Test\\" & More'],
      ["Simple Title", "Simple Title"],
      ["Title with \\ backslash", "Title with \\\\ backslash"],
      ['Multiple "quotes" here', 'Multiple \\"quotes\\" here'],
      ['Back\\slash and "quotes"', 'Back\\\\slash and \\"quotes\\"'],
    ])("should escape YAML special characters: %s", (inputTitle, expectedEscaped) => {
      const escapedTitle = escapeYamlString(inputTitle);

      expect(escapedTitle).toBe(expectedEscaped);
    });
  });

  describe("Source URL Construction", () => {
    it.each([
      [
        "hello-pepr-audit-logging",
        "https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/hello-pepr-audit-logging",
      ],
      [
        "hello-pepr-mutation",
        "https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/hello-pepr-mutation",
      ],
      [
        "hello-pepr-load",
        "https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/hello-pepr-load",
      ],
    ])("should construct source URL for %s", (exampleName, expectedUrl) => {
      const sourceUrl = generateExampleSourceUrl(exampleName);

      expect(sourceUrl).toBe(expectedUrl);
    });

    it("should format source link with markdown", () => {
      const exampleName = "hello-pepr-test";
      const sourceUrl = generateExampleSourceUrl(exampleName);
      const sourceLink = `\n\n> **Source:** [${exampleName}](${sourceUrl})\n\n`;

      expect(sourceLink).toContain("> **Source:**");
      expect(sourceLink).toContain(`[${exampleName}](${sourceUrl})`);
    });
  });

  describe("Sidebar Generation from File Structure", () => {
    it("should generate sidebar items with directories first, then files", async () => {
      const examplesDir = path.join(testDir, "sidebar-test");
      await fs.mkdir(examplesDir, { recursive: true });
      await fs.mkdir(path.join(examplesDir, "actions"), { recursive: true });
      await fs.mkdir(path.join(examplesDir, "filters"), { recursive: true });
      await fs.writeFile(path.join(examplesDir, "alias.md"), "# Alias");
      await fs.writeFile(path.join(examplesDir, "hooks.md"), "# Hooks");

      const items = generateExamplesSidebarItems(examplesDir);

      expect(items.length).toBe(4);
      expect(items[0].label).toBe("Actions");
      expect(items[0].autogenerate).toEqual({ directory: "examples/actions" });
      expect(items[1].label).toBe("Filters");
      expect(items[1].autogenerate).toEqual({ directory: "examples/filters" });
      expect(items[2].label).toBe("Alias");
      expect(items[2].link).toBe("examples/alias");
      expect(items[3].label).toBe("Hooks");
      expect(items[3].link).toBe("examples/hooks");
    });

    it("should convert directory names to proper labels", async () => {
      const examplesDir = path.join(testDir, "label-test");
      await fs.mkdir(examplesDir, { recursive: true });
      await fs.mkdir(path.join(examplesDir, "my-custom-category"), { recursive: true });
      await fs.mkdir(path.join(examplesDir, "pepr-config"), { recursive: true });

      const items = generateExamplesSidebarItems(examplesDir);

      expect(items[0].label).toBe("My Custom Category");
      expect(items[1].label).toBe("Pepr Config");
    });

    it("should convert file names to proper labels", async () => {
      const examplesDir = path.join(testDir, "file-label-test");
      await fs.mkdir(examplesDir, { recursive: true });
      await fs.writeFile(path.join(examplesDir, "generic-kind.md"), "# Generic Kind");
      await fs.writeFile(path.join(examplesDir, "load-test.md"), "# Load Test");

      const items = generateExamplesSidebarItems(examplesDir);

      expect(items[0].label).toBe("Generic Kind");
      expect(items[0].link).toBe("examples/generic-kind");
      expect(items[1].label).toBe("Load Test");
      expect(items[1].link).toBe("examples/load-test");
    });

    it("should return empty array when directory does not exist", () => {
      const nonExistentDir = path.join(testDir, "does-not-exist");
      const items = generateExamplesSidebarItems(nonExistentDir);

      expect(items).toEqual([]);
    });

    it("should sort directories and files alphabetically", async () => {
      const examplesDir = path.join(testDir, "sort-test");
      await fs.mkdir(examplesDir, { recursive: true });
      await fs.mkdir(path.join(examplesDir, "zebra"), { recursive: true });
      await fs.mkdir(path.join(examplesDir, "alpha"), { recursive: true });
      await fs.writeFile(path.join(examplesDir, "zulu.md"), "# Zulu");
      await fs.writeFile(path.join(examplesDir, "bravo.md"), "# Bravo");

      const items = generateExamplesSidebarItems(examplesDir);

      expect(items[0].label).toBe("Alpha");
      expect(items[1].label).toBe("Zebra");
      expect(items[2].label).toBe("Bravo");
      expect(items[3].label).toBe("Zulu");
    });
  });

  describe("Version Slug Generation", () => {
    it("should generate correct slugs for nested examples", () => {
      const version = "v1.0.2";
      const versionMajMin = version.replace(/^v(\d+\.\d+)\.\d+$/, "v$1");
      const relativePath = "actions";
      const fileSlug = "mutate";

      const fullSlug = `${versionMajMin}/examples/${relativePath}/${fileSlug}`;

      expect(fullSlug).toBe("v1.0/examples/actions/mutate");
    });

    it("should generate correct slugs for unnested examples", () => {
      const version = "v1.0.2";
      const versionMajMin = version.replace(/^v(\d+\.\d+)\.\d+$/, "v$1");
      const relativePath = "";
      const fileSlug = "alias";

      const fullSlug = relativePath
        ? `${versionMajMin}/examples/${relativePath}/${fileSlug}`
        : `${versionMajMin}/examples/${fileSlug}`;

      expect(fullSlug).toBe("v1.0/examples/alias");
    });
  });

  describe("Content Transformation Pipeline", () => {
    it("should transform categorized example with all components", () => {
      const exampleName = "hello-pepr-mutate";
      const readmeContent = `# Action: Mutate

This is a complete example that mutates resources.
- Feature 1
- Feature 2
`;

      const { category, title } = extractExampleCategory(readmeContent, exampleName);
      const content = removeHeading(readmeContent);
      const slug = generateExampleSlug(exampleName);
      const sourceUrl = generateExampleSourceUrl(exampleName);
      const sourceLink = `\n\n> **Source:** [${exampleName}](${sourceUrl})\n\n`;
      const frontmatter = `---\ntitle: "${escapeYamlString(title)}"\ndescription: "${escapeYamlString(title)}"\n---\n`;
      const finalContent = frontmatter + sourceLink + content;

      expect(category).toBe("action");
      expect(title).toBe("Mutate");
      expect(slug).toBe("mutate");
      expect(finalContent).toContain('title: "Mutate"');
      expect(finalContent).toContain('description: "Mutate"');
      expect(finalContent).toContain("> **Source:**");
      expect(finalContent).toContain("[hello-pepr-mutate]");
      expect(finalContent).toContain("This is a complete example that mutates resources.");
      expect(finalContent).not.toContain("# Action: Mutate");
    });

    it("should transform unnested example correctly", () => {
      const exampleName = "hello-pepr-alias";
      const readmeContent = "# Alias\n\nThis example shows alias usage.";

      const { category, title } = extractExampleCategory(readmeContent, exampleName);
      const content = removeHeading(readmeContent);

      expect(category).toBe("other");
      expect(title).toBe("Alias");
      expect(content).toBe("This example shows alias usage.");
    });
  });
});
