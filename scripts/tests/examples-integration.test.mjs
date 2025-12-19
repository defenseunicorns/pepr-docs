import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";

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

  describe("Title Extraction and Transformation", () => {
    it.each([
      ["# Audit Logging Example", "Audit Logging Example", "Audit Logging Example"],
      ["# Hello Pepr Test", "Hello Pepr Test", "Test"],
      ["# hello pepr validation", "hello pepr validation", "validation"],
      ["# HELLO PEPR Advanced", "HELLO PEPR Advanced", "Advanced"],
    ])(
      "should extract title from heading: %s",
      async (heading, rawTitle, cleanedTitle) => {
        const content = `${heading}\n\nExample content here...`;

        const headingMatch = content.match(/^#\s+(.+)$/m);
        let title = headingMatch ? headingMatch[1] : "";
        title = title.replace(/^hello\s+pepr\s+/i, "");

        expect(headingMatch[1]).toBe(rawTitle);
        expect(title).toBe(cleanedTitle);
      },
    );

    it("should generate fallback title from directory name when no heading exists", async () => {
      const exampleName = "hello-pepr-no-heading";
      const content = "This example has no heading.\n\nJust content.";

      const headingMatch = content.match(/^#\s+(.+)$/m);
      let title = headingMatch
        ? headingMatch[1]
        : exampleName.replace(/^hello-pepr-/, "").replace(/-/g, " ");
      title = title.replace(/^hello\s+pepr\s+/i, "");

      expect(headingMatch).toBeNull();
      expect(title).toBe("no heading");
    });

    it("should remove heading from content after extraction", async () => {
      const readmeContent = "# Full Test Example\n\nThis is the content...";

      const headingMatch = readmeContent.match(/^#\s+(.+)$/m);
      const contentWithoutHeading = headingMatch
        ? readmeContent.replace(/^#\s+.+$/m, "").trim()
        : readmeContent;

      expect(contentWithoutHeading).toBe("This is the content...");
      expect(contentWithoutHeading).not.toContain("# Full Test Example");
    });
  });

  describe("Slug Generation", () => {
    it.each([
      ["hello-pepr-audit-logging", "audit-logging"],
      ["hello-pepr-mutation", "mutation"],
      ["hello-pepr-validation", "validation"],
      ["hello-pepr-advanced-test", "advanced-test"],
      ["hello-pepr-load", "load"],
    ])("should generate slug from example name: %s -> %s", async (exampleName, expectedSlug) => {

      const slug = exampleName.replace(/^hello-pepr-/, "");

      expect(slug).toBe(expectedSlug);
    });
  });

  describe("YAML Frontmatter Escaping", () => {
    it.each([
      ['Example: "Test" & More', 'Example: \\"Test\\" & More'],
      ["Simple Title", "Simple Title"],
      ['Title with \\ backslash', 'Title with \\\\ backslash'],
      ['Multiple "quotes" here', 'Multiple \\"quotes\\" here'],
      ['Back\\slash and "quotes"', 'Back\\\\slash and \\"quotes\\"'],
    ])("should escape YAML special characters: %s", async (inputTitle, expectedEscaped) => {

      const escapeYamlString = str => str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const escapedTitle = escapeYamlString(inputTitle);

      expect(escapedTitle).toBe(expectedEscaped);
    });
  });

  describe("Source URL Construction", () => {
    it.each([
      ["hello-pepr-audit-logging", "https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/hello-pepr-audit-logging"],
      ["hello-pepr-mutation", "https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/hello-pepr-mutation"],
      ["hello-pepr-load", "https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/hello-pepr-load"],
    ])("should construct source URL for %s", async (exampleName, expectedUrl) => {

      const sourceUrl = `https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/${exampleName}`;

      expect(sourceUrl).toBe(expectedUrl);
    });

    it("should format source link with markdown", async () => {
      const exampleName = "hello-pepr-test";
      const sourceUrl = `https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/${exampleName}`;

      const sourceLink = `\n\n> **Source:** [${exampleName}](${sourceUrl})\n\n`;

      expect(sourceLink).toContain("> **Source:**");
      expect(sourceLink).toContain(`[${exampleName}](${sourceUrl})`);
    });
  });

  describe("Content Transformation Pipeline", () => {
    it("should transform README to output format with all components", async () => {
      const exampleName = "hello-pepr-full-test";
      const readmeContent = `# Full Test Example

This is a complete example with:
- Images: ![arch](_images/pepr-arch.svg)
- Links: [Guide](../guide/README.md)
`;

      let content = readmeContent;


      const headingMatch = content.match(/^#\s+(.+)$/m);
      let title = headingMatch
        ? headingMatch[1]
        : exampleName.replace(/^hello-pepr-/, "").replace(/-/g, " ");
      title = title.replace(/^hello\s+pepr\s+/i, "");

      if (headingMatch) {
        content = content.replace(/^#\s+.+$/m, "").trim();
      }

      const slug = exampleName.replace(/^hello-pepr-/, "");

      const escapeYamlString = str => str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const sourceUrl = `https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/${exampleName}`;
      const sourceLink = `\n\n> **Source:** [${exampleName}](${sourceUrl})\n\n`;
      const frontmatter = `---\ntitle: "${escapeYamlString(title)}"\ndescription: "${escapeYamlString(title)}"\n---\n`;

      const finalContent = frontmatter + sourceLink + content;

      expect(title).toBe("Full Test Example");
      expect(slug).toBe("full-test");
      expect(finalContent).toContain('title: "Full Test Example"');
      expect(finalContent).toContain('description: "Full Test Example"');
      expect(finalContent).toContain("> **Source:**");
      expect(finalContent).toContain("[hello-pepr-full-test]");
      expect(finalContent).toContain("This is a complete example with:");
      expect(finalContent).not.toContain("# Full Test Example");
    });

    it("should handle transformation when README has no heading", async () => {
      const exampleName = "hello-pepr-no-heading";
      const readmeContent = "This example has no heading.\n\nJust content.";

      const headingMatch = readmeContent.match(/^#\s+(.+)$/m);
      let title = headingMatch
        ? headingMatch[1]
        : exampleName.replace(/^hello-pepr-/, "").replace(/-/g, " ");
      title = title.replace(/^hello\s+pepr\s+/i, "");

      const content = headingMatch
        ? readmeContent.replace(/^#\s+.+$/m, "").trim()
        : readmeContent;

      expect(title).toBe("no heading");
      expect(content).toBe("This example has no heading.\n\nJust content.");
    });
  });

});
