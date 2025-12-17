import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { escapeYamlString, heredoc } from "./test-helpers.mjs";

describe("EXAMPLES Processing", () => {
  // ============================================================================
  // COMMON SECTIONS (mirrored in core-processing.test.mjs)
  // ============================================================================

  describe("Title Extraction", () => {
    it("should extract title from first heading", () => {
      const content = "# Hello Pepr Audit Logging\n\nThis is an example...";
      const headingMatch = content.match(/^#\s+(.+)$/m);
      const title = headingMatch[1];

      expect(title).toBe("Hello Pepr Audit Logging");
    });

    it("should handle multiple headings and only extract the first", () => {
      const content = "# Main Title\n\n## Subtitle\n\n### Section";
      const headingMatch = content.match(/^#\s+(.+)$/m);
      const title = headingMatch[1];

      expect(title).toBe("Main Title");
    });

    it("should derive title from directory name when no heading exists", () => {
      const content = "This is an example without a heading...";
      const exampleName = "hello-pepr-audit-logging";
      const headingMatch = content.match(/^#\s+(.+)$/m);
      const title = headingMatch
        ? headingMatch[1]
        : exampleName.replace(/^hello-pepr-/, "").replace(/-/g, " ");

      expect(title).toBe("audit logging");
    });

    it("should handle titles without Hello Pepr prefix", () => {
      const content = "# Audit Logging Example\n\nContent...";
      const headingMatch = content.match(/^#\s+(.+)$/m);
      const title = headingMatch[1];

      expect(title).toBe("Audit Logging Example");
    });
  });

  describe("Heading Removal", () => {
    it("should remove first heading from content", () => {
      const content = "# Main Title\n\nBody content here";
      const headingMatch = content.match(/^#\s+(.+)$/m);
      const processedContent = headingMatch ? content.replace(/^#\s+.+$/m, "").trim() : content;

      expect(processedContent).toBe("Body content here");
      expect(processedContent).not.toContain("# Main Title");
    });

    it("should not remove subheadings", () => {
      const content = "# Main Title\n\n## Subtitle\n\nContent";
      const headingMatch = content.match(/^#\s+(.+)$/m);
      const processedContent = headingMatch ? content.replace(/^#\s+.+$/m, "").trim() : content;

      expect(processedContent).toContain("## Subtitle");
    });

    it("should leave content unchanged when no heading exists", () => {
      const content = "Just body content\n\n## A subtitle";
      const headingMatch = content.match(/^#\s+(.+)$/m);
      const processedContent = headingMatch ? content.replace(/^#\s+.+$/m, "").trim() : content;

      expect(processedContent).toBe(content);
    });
  });

  describe("Path/Slug Generation", () => {
    it("should remove hello-pepr- prefix from example name", () => {
      const exampleName = "hello-pepr-audit-logging";
      const slug = exampleName.replace(/^hello-pepr-/, "");

      expect(slug).toBe("audit-logging");
    });

    it("should handle example names without the prefix", () => {
      const exampleName = "custom-example";
      const slug = exampleName.replace(/^hello-pepr-/, "");

      expect(slug).toBe("custom-example");
    });

    it("should preserve hyphens in the slug", () => {
      const exampleName = "hello-pepr-multi-word-example";
      const slug = exampleName.replace(/^hello-pepr-/, "");

      expect(slug).toBe("multi-word-example");
    });

    it("should generate correct output path with slug", () => {
      const examplesDir = "/tmp/content/latest/examples";
      const slug = "audit-logging";
      const outputPath = path.join(examplesDir, `${slug}.md`);

      expect(outputPath).toBe("/tmp/content/latest/examples/audit-logging.md");
    });

    it("should preserve hyphenated slugs in path", () => {
      const examplesDir = "/tmp/content/latest/examples";
      const slug = "multi-word-example";
      const outputPath = path.join(examplesDir, `${slug}.md`);

      expect(outputPath).toContain("multi-word-example.md");
    });
  });

  describe("Frontmatter Generation", () => {
    it("should generate valid YAML frontmatter", () => {
      const title = "Audit Logging Example";
      const frontmatter = heredoc`
        ---
        title: "${escapeYamlString(title)}"
        description: "${escapeYamlString(title)}"
        ---
      `;

      expect(frontmatter).toContain("---");
      expect(frontmatter).toContain('title: "Audit Logging Example"');
      expect(frontmatter).toContain('description: "Audit Logging Example"');
    });

    it("should handle titles with special characters", () => {
      const title = 'Example: "Test" & More';
      const frontmatter = heredoc`
        ---
        title: "${escapeYamlString(title)}"
        description: "${escapeYamlString(title)}"
        ---
      `;

      expect(frontmatter).toContain('title: "Example: \\"Test\\" & More"');
    });
  });

  describe("Complete Processing Pipeline", () => {
    it("should process example with heading", () => {
      const exampleName = "hello-pepr-audit-logging";
      let content =
        "# Audit Logging Example\n\nThis example shows...\n\n![image](_images/demo.png)";

      const headingMatch = content.match(/^#\s+(.+)$/m);
      let title = headingMatch
        ? headingMatch[1]
        : exampleName.replace(/^hello-pepr-/, "").replace(/-/g, " ");
      title = title.replace(/^hello\s+pepr\s+/i, "");

      if (headingMatch) {
        content = content.replace(/^#\s+.+$/m, "").trim();
      }

      const slug = exampleName.replace(/^hello-pepr-/, "");

      const sourceUrl = `https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/${exampleName}`;
      const sourceLink = `\n\n> **Source:** [${exampleName}](${sourceUrl})\n\n`;

      const frontmatter = `---\ntitle: "${escapeYamlString(title)}"\ndescription: "${escapeYamlString(title)}"\n---\n`;

      const finalContent = frontmatter + sourceLink + content;

      expect(title).toBe("Audit Logging Example");
      expect(slug).toBe("audit-logging");
      expect(finalContent).toContain('title: "Audit Logging Example"');
      expect(finalContent).toContain("> **Source:**");
      expect(finalContent).toContain("This example shows...");
      expect(finalContent).not.toContain("# Audit Logging Example");
    });

    it("should process example without heading", () => {
      const exampleName = "hello-pepr-mutation";
      let content = "This example demonstrates mutation...";

      const headingMatch = content.match(/^#\s+(.+)$/m);
      let title = headingMatch
        ? headingMatch[1]
        : exampleName.replace(/^hello-pepr-/, "").replace(/-/g, " ");
      title = title.replace(/^hello\s+pepr\s+/i, "");

      const slug = exampleName.replace(/^hello-pepr-/, "");

      expect(title).toBe("mutation");
      expect(slug).toBe("mutation");
      expect(content).toBe("This example demonstrates mutation...");
    });

    it("should handle examples with special characters in title", () => {
      const exampleName = "hello-pepr-test";
      let content = '# Example: "Advanced" Testing\n\nContent here...';

      const headingMatch = content.match(/^#\s+(.+)$/m);
      let title = headingMatch
        ? headingMatch[1]
        : exampleName.replace(/^hello-pepr-/, "").replace(/-/g, " ");
      title = title.replace(/^hello\s+pepr\s+/i, "");

      if (headingMatch) {
        content = content.replace(/^#\s+.+$/m, "").trim();
      }

      const frontmatter = `---\ntitle: "${escapeYamlString(title)}"\ndescription: "${escapeYamlString(title)}"\n---\n`;

      expect(frontmatter).toContain('title: "Example: \\"Advanced\\" Testing"');
    });
  });

  // ============================================================================
  // EXAMPLES-SPECIFIC SECTIONS
  // ============================================================================

  describe("Hello Pepr Prefix Removal", () => {
    it.each([
      { input: "Hello Pepr Watch", expected: "Watch" },
      { input: "hello pepr watch", expected: "watch" },
      { input: "HELLO PEPR Watch", expected: "Watch" },
      { input: "HeLLo PePr Mutation", expected: "Mutation" },
    ])("should remove Hello Pepr prefix: '$input' -> '$expected'", ({ input, expected }) => {
      const title = input.replace(/^hello\s+pepr\s+/i, "");
      expect(title).toBe(expected);
    });

    it("should extract title and remove Hello Pepr prefix", () => {
      const content = "# Hello Pepr Audit Logging\n\nThis is an example...";
      const headingMatch = content.match(/^#\s+(.+)$/m);
      let title = headingMatch ? headingMatch[1] : "fallback";
      title = title.replace(/^hello\s+pepr\s+/i, "");

      expect(title).toBe("Audit Logging");
    });

    it("should handle titles without Hello Pepr prefix", () => {
      const title = "Audit Logging Example";
      const cleaned = title.replace(/^hello\s+pepr\s+/i, "");

      expect(cleaned).toBe("Audit Logging Example");
    });
  });

  describe("YAML Frontmatter Escaping", () => {
    it.each([
      {
        input: 'Example with "quotes"',
        expected: 'Example with \\"quotes\\"',
        description: "escape double quotes",
      },
      {
        input: "Example with \\ backslash",
        expected: "Example with \\\\ backslash",
        description: "escape backslashes",
      },
      {
        input: 'Path: C:\\Program Files\\"test"',
        expected: 'Path: C:\\\\Program Files\\\\\\"test\\"',
        description: "escape both backslashes and quotes",
      },
      {
        input: "Example: A Test",
        expected: "Example: A Test",
        description: "handle colons without escaping",
      },
      { input: "", expected: "", description: "handle empty strings" },
    ])("should $description", ({ input, expected }) => {
      const escaped = escapeYamlString(input);
      expect(escaped).toBe(expected);
    });
  });

  describe("Source Link Generation", () => {
    it("should generate correct GitHub URL", () => {
      const exampleName = "hello-pepr-audit-logging";
      const sourceUrl = `https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/${exampleName}`;

      expect(sourceUrl).toBe(
        "https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/hello-pepr-audit-logging",
      );
    });

    it("should format source link as blockquote", () => {
      const exampleName = "hello-pepr-audit-logging";
      const sourceUrl = `https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/${exampleName}`;
      const sourceLink = `\n\n> **Source:** [${exampleName}](${sourceUrl})\n\n`;

      expect(sourceLink).toContain("> **Source:**");
      expect(sourceLink).toContain(`[${exampleName}]`);
      expect(sourceLink).toContain(`(${sourceUrl})`);
    });
  });

  describe("Glob Pattern Matching", () => {
    it("should match hello-pepr-* directory pattern", () => {
      const pattern = "hello-pepr-*";
      const testDirs = [
        "hello-pepr-audit-logging",
        "hello-pepr-mutation",
        "hello-pepr-validation",
        "other-example",
        "hello-pepr",
      ];

      const matched = testDirs.filter(dir => {
        const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
        return regex.test(dir);
      });

      expect(matched).toContain("hello-pepr-audit-logging");
      expect(matched).toContain("hello-pepr-mutation");
      expect(matched).toContain("hello-pepr-validation");
      expect(matched).not.toContain("other-example");
      expect(matched).not.toContain("hello-pepr");
    });
  });
});
