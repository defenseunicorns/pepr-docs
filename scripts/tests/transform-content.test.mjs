import { describe, expect, it } from "vitest";
import { transformContent } from "../lib/transform-content.mjs";

describe("transformContent", () => {
  describe("Video URL Transformation", () => {
    it("should convert bare .mp4 URLs to video tags", () => {
      const content = "Check out this video: https://example.com/demo.mp4";
      const result = transformContent(content);

      expect(result).toContain('<video class="td-content" controls src="https://example.com/demo.mp4"></video>');
    });

    it("should not convert .mp4 URLs already in src attributes", () => {
      const content = '<video src="https://example.com/demo.mp4"></video>';
      const result = transformContent(content);

      expect(result).toBe(content);
    });

    it("should handle multiple video URLs", () => {
      const content = "Video 1: https://example.com/demo1.mp4\nVideo 2: https://example.com/demo2.mp4";
      const result = transformContent(content);

      expect(result).toContain('src="https://example.com/demo1.mp4"');
      expect(result).toContain('src="https://example.com/demo2.mp4"');
    });
  });

  describe("Link Transformations", () => {
    describe("External URLs", () => {
      it.each([
        ["https://example.com", "[Link](https://example.com)"],
        ["http://example.com/page", "[Link](http://example.com/page)"],
      ])("should not modify external URLs: %s", (url, content) => {
        const result = transformContent(content);
        expect(result).toBe(content);
      });
    });

    describe("Root File Mappings", () => {
      it.each([
        ["../../security.md", "[Security](../../security.md)", "[Security](./security)"],
        ["../../support.md", "[Support](../../support.md)", "[Support](./support)"],
        ["../../code-of-conduct.md", "[Code](../../code-of-conduct.md)", "[Code](./code-of-conduct)"],
        ["../../OTHER_FILE.md (unmatched)", "[Other](../../OTHER_FILE.md)", "[Other](../../other_file)"],
      ])("should process %s", (description, input, expected) => {
        const result = transformContent(input);
        expect(result).toBe(expected);
      });
    });

    describe("README.md Removal", () => {
      it.each([
        ["./getting-started/README.md", "[Guide](./getting-started/README.md)", "[Guide](./getting-started)"],
        ["./docs/guide/README.md", "[Docs](./docs/guide/README.md)", "[Docs](guide)"],
      ])("should remove README.md from %s", (path, input, expected) => {
        const result = transformContent(input);
        expect(result).toBe(expected);
      });
    });

    describe("_images Path Handling", () => {
      it("should convert _images paths via fixImagePaths", () => {
        const content = "[Image](_images/diagram.png)";
        const result = transformContent(content);

        // fixImagePaths converts _images to /assets/ for image references
        expect(result).toContain("/assets/diagram.png");
      });
    });

    describe("docs/ Prefix Stripping", () => {
      it.each([
        ["./docs/", "[Guide](./docs/getting-started.md)", "[Guide](getting-started)"],
        ["/docs/", "[Guide](/docs/getting-started.md)", "[Guide](/getting-started)"],
        ["docs/", "[Guide](docs/getting-started.md)", "[Guide](getting-started)"],
      ])("should strip %s prefix", (prefix, input, expected) => {
        const result = transformContent(input);
        expect(result).toBe(expected);
      });
    });

    describe(".md Extension Removal", () => {
      it("should remove .md extension from links", () => {
        const content = "[Guide](./getting-started.md)";
        const result = transformContent(content);

        expect(result).toBe("[Guide](./getting-started)");
      });

      it("should handle links without .md extension", () => {
        const content = "[Guide](./getting-started)";
        const result = transformContent(content);

        expect(result).toBe("[Guide](./getting-started)");
      });
    });

    describe("Lowercase Conversion", () => {
      it("should convert URLs to lowercase", () => {
        const content = "[Guide](./Getting-Started.md)";
        const result = transformContent(content);

        expect(result).toBe("[Guide](./getting-started)");
      });
    });
  });

  describe("MDX Escaping", () => {
    describe("@param Escaping", () => {
      it("should escape **@param to **\\@param", () => {
        const content = "Function documentation: **@param name - The name";
        const result = transformContent(content);

        expect(result).toContain("**\\@param");
      });

      it("should not escape @param without **", () => {
        const content = "@param name - The name";
        const result = transformContent(content);

        expect(result).toBe("@param name - The name");
      });
    });

    describe("Email Address Escaping", () => {
      it("should escape email addresses in angle brackets", () => {
        const content = "Contact <user@example.com> for help";
        const result = transformContent(content);

        expect(result).toContain("&lt;user@example.com&gt;");
      });

      it("should not escape email addresses without angle brackets", () => {
        const content = "Contact user@example.com for help";
        const result = transformContent(content);

        expect(result).toBe("Contact user@example.com for help");
      });
    });

    describe("Special Character Escaping", () => {
      it.each([
        ["@mention", "<@mention>", "&lt;@mention&gt;"],
        ["!important", "<!important>", "&lt;!important&gt;"],
      ])("should escape <%s>", (description, input, expected) => {
        const result = transformContent(input);
        expect(result).toContain(expected);
      });
    });
  });

  describe("HTML Comment Removal", () => {
    it("should remove HTML comments", () => {
      const content = "Text <!-- This is a comment --> More text";
      const result = transformContent(content);

      expect(result).not.toContain("<!--");
      expect(result).not.toContain("-->");
      expect(result).toContain("Text  More text");
    });

    it("should remove multiline HTML comments", () => {
      const content = "Text <!--\nMultiline\nComment\n--> More";
      const result = transformContent(content);

      expect(result).not.toContain("<!--");
      expect(result).toContain("Text  More");
    });
  });

  describe("Image Path Transformations", () => {
    it.each([
      ["_images/diagram.png", "![Diagram](_images/diagram.png)", "/assets/diagram.png"],
      ["../_images/diagram.svg", "![Diagram](../_images/diagram.svg)", "/assets/diagram.svg"],
      ["resources/create-pepr-operator/light.png", "![Diagram](resources/create-pepr-operator/light.png)", "/assets/light.png"],
    ])("should fix %s to /assets/", (path, input, expectedPath) => {
      const result = transformContent(input);
      expect(result).toContain(expectedPath);
    });
  });

  describe("Complex Scenarios", () => {
    it("should apply all transformations in correct order", () => {
      const content = `
# Guide

Check out [the docs](./docs/getting-started.md) and [security](../../security.md)

Video: https://example.com/demo.mp4

![Image](_images/diagram.png)

<!-- Comment -->

Contact **@param** <user@example.com>
      `.trim();

      const result = transformContent(content);

      // Video transformation
      expect(result).toContain('<video class="td-content" controls src="https://example.com/demo.mp4"></video>');

      // Link transformations
      expect(result).toContain("[the docs](getting-started)");
      expect(result).toContain("](./security)");

      // Image path transformation
      expect(result).toContain("/assets/diagram.png");

      // HTML comment removal
      expect(result).not.toContain("<!--");

      // MDX escaping
      expect(result).toContain("**\\@param");
      expect(result).toContain("&lt;user@example.com&gt;");
    });

    it("should handle empty content", () => {
      const result = transformContent("");
      expect(result).toBe("");
    });

    it("should handle content with only whitespace", () => {
      const result = transformContent("   \n\n   ");
      expect(result).toBe("   \n\n   ");
    });
  });
});
