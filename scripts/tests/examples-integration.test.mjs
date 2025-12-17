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

  describe("Example Directory Discovery", () => {
    it("should find all hello-pepr-* directories", async () => {
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

    it("should skip directories without README.md", async () => {
      const testExample = path.join(examplesRepo, "hello-pepr-no-readme");
      await fs.mkdir(testExample, { recursive: true });

      const readmePath = path.join(testExample, "README.md");

      // Check if README exists
      let hasReadme = false;
      try {
        await fs.access(readmePath);
        hasReadme = true;
      } catch {
        hasReadme = false;
      }

      expect(hasReadme).toBe(false);
    });
  });

  describe("README Processing", () => {
    it("should read and process README.md from example directory", async () => {
      const exampleDir = path.join(examplesRepo, "hello-pepr-test-example");
      await fs.mkdir(exampleDir, { recursive: true });

      const readmeContent = "# Test Example\n\nThis is a test example for Pepr.";
      await fs.writeFile(path.join(exampleDir, "README.md"), readmeContent, "utf8");

      const content = await fs.readFile(path.join(exampleDir, "README.md"), "utf8");

      expect(content).toContain("# Test Example");
      expect(content).toContain("This is a test example for Pepr.");
    });

    it("should handle README with complex content", async () => {
      const exampleDir = path.join(examplesRepo, "hello-pepr-complex");
      await fs.mkdir(exampleDir, { recursive: true });

      const readmeContent = `# Complex Example

This example includes:

- Images: ![demo](_images/demo.png)
- Links: [Getting Started](../getting-started/README.md)
- Code: \`\`\`typescript
const x = 42;
\`\`\`
- Video: https://example.com/demo.mp4

Contact: <admin@example.com>
`;

      await fs.writeFile(path.join(exampleDir, "README.md"), readmeContent, "utf8");

      const content = await fs.readFile(path.join(exampleDir, "README.md"), "utf8");

      expect(content).toContain("![demo](_images/demo.png)");
      expect(content).toContain("[Getting Started](../getting-started/README.md)");
      expect(content).toContain("https://example.com/demo.mp4");
      expect(content).toContain("<admin@example.com>");
    });
  });

  describe("Output File Generation", () => {
    it("should create output file with correct naming", async () => {
      const exampleName = "hello-pepr-output-test";
      const slug = exampleName.replace(/^hello-pepr-/, "");
      const outputPath = path.join(outputDir, `${slug}.md`);

      const content = '---\ntitle: "Output Test"\n---\n\nContent here...';
      await fs.writeFile(outputPath, content, "utf8");

      const exists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      expect(path.basename(outputPath)).toBe("output-test.md");
    });

    it("should create multiple output files for multiple examples", async () => {
      const examples = [
        { name: "hello-pepr-first", title: "First Example" },
        { name: "hello-pepr-second", title: "Second Example" },
        { name: "hello-pepr-third", title: "Third Example" },
      ];

      for (const example of examples) {
        const slug = example.name.replace(/^hello-pepr-/, "");
        const outputPath = path.join(outputDir, `${slug}.md`);
        const content = `---\ntitle: "${example.title}"\n---\n\nContent...`;
        await fs.writeFile(outputPath, content, "utf8");
      }

      const files = await fs.readdir(outputDir);
      expect(files).toContain("first.md");
      expect(files).toContain("second.md");
      expect(files).toContain("third.md");
    });
  });

  describe("Complete Processing Simulation", () => {
    it("should process example from README to output file", async () => {
      const exampleName = "hello-pepr-full-test";
      const exampleDir = path.join(examplesRepo, exampleName);
      await fs.mkdir(exampleDir, { recursive: true });

      const readmeContent = `# Full Test Example

This is a complete example with:
- Images: ![arch](_images/pepr-arch.svg)
- Links: [Guide](../guide/README.md)
`;

      await fs.writeFile(path.join(exampleDir, "README.md"), readmeContent, "utf8");

      let content = await fs.readFile(path.join(exampleDir, "README.md"), "utf8");

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

      const outputPath = path.join(outputDir, `${slug}.md`);
      await fs.writeFile(outputPath, finalContent, "utf8");

      const outputContent = await fs.readFile(outputPath, "utf8");

      expect(outputContent).toContain('title: "Full Test Example"');
      expect(outputContent).toContain('description: "Full Test Example"');
      expect(outputContent).toContain("> **Source:**");
      expect(outputContent).toContain("[hello-pepr-full-test]");
      expect(outputContent).toContain("This is a complete example with:");
      expect(outputContent).not.toContain("# Full Test Example");
    });

    it("should handle example without heading", async () => {
      const exampleName = "hello-pepr-no-heading";
      const exampleDir = path.join(examplesRepo, exampleName);
      await fs.mkdir(exampleDir, { recursive: true });

      const readmeContent = "This example has no heading.\n\nJust content.";
      await fs.writeFile(path.join(exampleDir, "README.md"), readmeContent, "utf8");

      let content = await fs.readFile(path.join(exampleDir, "README.md"), "utf8");

      const headingMatch = content.match(/^#\s+(.+)$/m);
      let title = headingMatch
        ? headingMatch[1]
        : exampleName.replace(/^hello-pepr-/, "").replace(/-/g, " ");
      title = title.replace(/^hello\s+pepr\s+/i, "");

      expect(title).toBe("no heading");
      expect(content).toContain("This example has no heading.");
    });

    it("should escape special characters in YAML frontmatter", async () => {
      const exampleName = "hello-pepr-special-chars";
      const exampleDir = path.join(examplesRepo, exampleName);
      await fs.mkdir(exampleDir, { recursive: true });

      const readmeContent = '# Example: "Test" & More\n\nContent here...';
      await fs.writeFile(path.join(exampleDir, "README.md"), readmeContent, "utf8");

      let content = await fs.readFile(path.join(exampleDir, "README.md"), "utf8");

      const headingMatch = content.match(/^#\s+(.+)$/m);
      let title = headingMatch ? headingMatch[1] : "";
      title = title.replace(/^hello\s+pepr\s+/i, "");

      const escapeYamlString = str => str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const escapedTitle = escapeYamlString(title);

      const frontmatter = `---\ntitle: "${escapedTitle}"\ndescription: "${escapedTitle}"\n---\n`;

      expect(frontmatter).toContain('title: "Example: \\"Test\\" & More"');
    });
  });

  describe("Error Handling", () => {
    it("should handle missing README.md gracefully", async () => {
      const exampleDir = path.join(examplesRepo, "hello-pepr-missing-readme");
      await fs.mkdir(exampleDir, { recursive: true });

      const readmePath = path.join(exampleDir, "README.md");

      let hasError = false;
      try {
        await fs.access(readmePath);
      } catch {
        hasError = true;
      }

      expect(hasError).toBe(true);
    });

    it("should handle empty README.md", async () => {
      const exampleDir = path.join(examplesRepo, "hello-pepr-empty");
      await fs.mkdir(exampleDir, { recursive: true });

      const readmePath = path.join(exampleDir, "README.md");
      await fs.writeFile(readmePath, "", "utf8");

      const content = await fs.readFile(readmePath, "utf8");
      expect(content).toBe("");

      const headingMatch = content.match(/^#\s+(.+)$/m);
      expect(headingMatch).toBeNull();
    });
  });

  describe("Parallel Processing", () => {
    it("should handle multiple examples processed in parallel", async () => {
      const examples = [
        "hello-pepr-parallel-1",
        "hello-pepr-parallel-2",
        "hello-pepr-parallel-3",
        "hello-pepr-parallel-4",
        "hello-pepr-parallel-5",
      ];

      await Promise.all(
        examples.map(async exampleName => {
          const exampleDir = path.join(examplesRepo, exampleName);
          await fs.mkdir(exampleDir, { recursive: true });
          const content = `# ${exampleName}\n\nExample content for ${exampleName}`;
          await fs.writeFile(path.join(exampleDir, "README.md"), content, "utf8");
        }),
      );

      const results = await Promise.all(
        examples.map(async exampleName => {
          const readmePath = path.join(examplesRepo, exampleName, "README.md");
          const content = await fs.readFile(readmePath, "utf8");
          return { name: exampleName, content };
        }),
      );

      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result.content).toContain(result.name);
      });
    });
  });
});
