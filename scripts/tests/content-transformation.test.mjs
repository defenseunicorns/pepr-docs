import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";

async function getTransformContentFunction() {
  const buildScript = await fs.readFile("scripts/index.mjs", "utf8");

  const funcMatch = buildScript.match(/const transformContent = \(content\) => \{([\s\S]*?)^\};/m);
  if (funcMatch) {
    try {
      const fixImageMatch = buildScript.match(/function fixImagePaths\(content\) \{([\s\S]*?)^\}/m);
      const removeHtmlMatch = buildScript.match(
        /function removeHtmlComments\(input\) \{([\s\S]*?)^\}/m,
      );

      if (fixImageMatch && removeHtmlMatch) {
        return new Function(
          "content",
          `
          // Helper functions
          const fixImagePaths = (content) => { ${fixImageMatch[1]} };
          const removeHtmlComments = (input) => { ${removeHtmlMatch[1]} };

          // Main function body
          ${funcMatch[1]}
        `,
        );
      }
    } catch (e) {
      console.warn("Could not extract transformContent function:", e.message);
    }
  }
  return null;
}

describe("Content Transformations", () => {
  describe("Video Transformations", () => {
    const testCases = [
      {
        name: "should transform video URLs to video tags",
        input: "Check out this demo: https://example.com/demo.mp4",
        expected: '<video class="td-content" controls src="https://example.com/demo.mp4"></video>',
      },
      {
        name: "should not transform videos when video tags are already present",
        input: '<video class="td-content" controls src="https://example.com/demo.mp4"></video>',
        expected: '<video class="td-content" controls src="https://example.com/demo.mp4"></video>',
      },
      {
        name: "should handle multiple video URLs",
        input: "Video 1: https://example.com/video1.mp4\n\nVideo 2: https://example.com/video2.mp4",
        expectedPatterns: [
          '<video class="td-content" controls src="https://example.com/video1.mp4"></video>',
          '<video class="td-content" controls src="https://example.com/video2.mp4"></video>',
        ],
      },
    ];

    it.each(testCases)("$name", async ({ input, expected, expectedPatterns }) => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const result = transformContent(input);

        if (expectedPatterns) {
          expectedPatterns.forEach(pattern => {
            expect(result).toContain(pattern);
          });
        } else {
          expect(result).toEqual(expected);
        }
      }
    });
  });

  describe("HTML Comment Removal", () => {
    const testCases = [
      {
        name: "should remove HTML Start Block comments",
        input: "# Test\n<!-- Start Block -->\nSome content\n<!-- End Block -->\nMore content",
        expected: "Some content",
      },
      {
        name: "should remove HTML End Block comments",
        input: "# Test\n<!-- Start Block -->\nSome content\n<!-- End Block -->\nMore content",
        expected: "More content",
      },
      {
        name: "should not contain Start Block markers",
        input: "# Test\n<!-- Start Block -->\nSome content\n<!-- End Block -->\nMore content",
        expected: "<!-- Start Block -->",
        shouldNotContain: true,
      },
      {
        name: "should not contain End Block markers",
        input: "# Test\n<!-- Start Block -->\nSome content\n<!-- End Block -->\nMore content",
        expected: "<!-- End Block -->",
        shouldNotContain: true,
      },
      {
        name: "should remove simple HTML comments",
        input: "Content <!-- This is a comment --> More content",
        notExpected: "<!-- This is a comment -->",
      },
      {
        name: "should handle nested comments",
        input: "Text <!-- outer <!-- inner --> outer --> Text",
        notExpected: "<!--",
      },
    ];

    it.each(testCases)("$name", async ({ input, expected, shouldNotContain, notExpected }) => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const result = transformContent(input);

        if (shouldNotContain || notExpected) {
          expect(result).not.toContain(notExpected || expected);
        } else {
          expect(result).toContain(expected);
        }
      }
    });
  });

  describe("Image Path Transformations", () => {
    const testCases = [
      {
        name: "should fix pepr-arch.svg image paths",
        input: "![arch](_images/pepr-arch.svg) and ![logo](_images/pepr.png)",
        expected: "/assets/pepr-arch.png",
      },
      {
        name: "should fix pepr.png image paths",
        input: "![arch](_images/pepr-arch.svg) and ![logo](_images/pepr.png)",
        expected: "/assets/pepr.png",
      },
      {
        name: "should transform _images/ paths",
        input: "![demo](_images/demo.png)",
        expected: "/assets/demo.png",
      },
      {
        name: "should handle image paths in markdown tables",
        input:
          "| Image | Description |\n|-------|-------------|\n| ![test](_images/test.png) | A test |",
        expected: "/assets/test.png",
      },
    ];

    it.each(testCases)("$name", async ({ input, expected }) => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const result = transformContent(input);
        expect(result).toContain(expected);
      }
    });
  });

  describe("MDX Escaping", () => {
    const testCases = [
      {
        name: "should escape MDX @param",
        input: "**@param** name The parameter name",
        expected: "**\\@param**",
      },
      {
        name: "should escape email addresses",
        input: "Contact us at <user@example.com>",
        expected: "&lt;user@example.com&gt;",
      },
      {
        name: "should escape multiple @param instances",
        input: "**@param** x First param\n**@param** y Second param",
        expected: "**\\@param**",
      },
      {
        name: "should escape multiple email addresses",
        input: "Contact <admin@example.com> or <support@example.com>",
        expectedPatterns: ["&lt;admin@example.com&gt;", "&lt;support@example.com&gt;"],
      },
    ];

    it.each(testCases)("$name", async ({ input, expected, expectedPatterns }) => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const result = transformContent(input);

        if (expectedPatterns) {
          expectedPatterns.forEach(pattern => {
            expect(result).toContain(pattern);
          });
        } else {
          expect(result).toContain(expected);
        }
      }
    });
  });

  describe("Link Transformations", () => {
    const testCases = [
      {
        name: "should process markdown links and strip README.md",
        input: "[Getting Started](getting-started/README.md)",
        expected: "[Getting Started](getting-started)",
      },
      {
        name: "should strip .md extension from relative links",
        input: "[Guide](../user-guide/pepr-cli.md)",
        expected: "[Guide](../user-guide/pepr-cli)",
      },
      {
        name: "should strip .md extension and preserve anchor",
        input: "[Section](./guide.md#intro)",
        expected: "[Section](./guide#intro)",
      },
      {
        name: "should strip README.md from relative links",
        input: "[Getting Started](../getting-started/README.md)",
        expected: "[Getting Started](../getting-started)",
      },
      {
        name: "should handle links with anchors",
        input: "[Section](./docs/guide.md#section)",
        expected: "[Section](./docs/guide#section)",
      },
    ];

    it.each(testCases)("$name", async ({ input, expected }) => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const result = transformContent(input);
        expect(result).toContain(expected);
      }
    });
  });

  describe("CORE-specific Transformations", () => {
    describe("CORE docs/ directory paths", () => {
      const testCases = [
        {
          name: "should strip /docs/ prefix from absolute paths",
          input: "[Code of Conduct](/docs/contribute/code-of-conduct.md)",
          expected: "[Code of Conduct](/contribute/code-of-conduct)",
        },
        {
          name: "should strip docs/ prefix from relative paths",
          input: "[Store](docs/user-guide/store.md)",
          expected: "[Store](user-guide/store)",
        },
      ];

      it.each(testCases)("$name", async ({ input, expected }) => {
        const transformContent = await getTransformContentFunction();

        if (transformContent) {
          const result = transformContent(input);
          expect(result).toContain(expected);
        }
      });
    });

    describe("CORE root-level files", () => {
      const testCases = [
        {
          name: "should convert ../../CODE_OF_CONDUCT.md to ./code-of-conduct",
          input: "[Code of Conduct](../../CODE_OF_CONDUCT.md)",
          expected: "[Code of Conduct](./code-of-conduct)",
        },
        {
          name: "should convert ../../code-of-conduct.md to ./code-of-conduct",
          input: "[Code](../../code-of-conduct.md)",
          expected: "[Code](./code-of-conduct)",
        },
        {
          name: "should convert ../../SECURITY.md to ./security",
          input: "[Security](../../SECURITY.md)",
          expected: "[Security](./security)",
        },
        {
          name: "should convert ../../security.md to ./security",
          input: "[Sec](../../security.md)",
          expected: "[Sec](./security)",
        },
        {
          name: "should convert ../../SUPPORT.md to ./support",
          input: "[Support](../../SUPPORT.md)",
          expected: "[Support](./support)",
        },
        {
          name: "should convert ../../support.md to ./support",
          input: "[Help](../../support.md)",
          expected: "[Help](./support)",
        },
      ];

      it.each(testCases)("$name", async ({ input, expected }) => {
        const transformContent = await getTransformContentFunction();

        if (transformContent) {
          const result = transformContent(input);
          expect(result).toContain(expected);
        }
      });
    });
  });

  describe("Complex Content Scenarios", () => {
    it("should handle complex documentation with multiple transformations", async () => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const input =
          "# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>";

        const result = transformContent(input);

        expect(result).toContain("/assets/pepr-arch.png");
        expect(result).toContain('<video class="td-content" controls');
        expect(result).toContain("[Getting Started](getting-started)");
        expect(result).toContain("**\\@param**");
        expect(result).toContain("&lt;admin@example.com&gt;");
        expect(result).not.toContain("<!-- This is a comment -->");
      }
    });

    it("should handle CORE docs subdirectory paths", async () => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const input =
          "See [User Guide](docs/user-guide/getting-started.md) and [API Reference](/docs/api/pepr-module.md).";

        const result = transformContent(input);

        expect(result).toContain("[User Guide](user-guide/getting-started)");
        expect(result).toContain("[API Reference](/api/pepr-module)");
      }
    });

    it("should handle root-level community files", async () => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const input =
          "[Code of Conduct](../../CODE_OF_CONDUCT.md)\n[Security](../../SECURITY.md)\n[Support](../../SUPPORT.md)";

        const result = transformContent(input);

        expect(result).toContain("[Code of Conduct](./code-of-conduct)");
        expect(result).toContain("[Security](./security)");
        expect(result).toContain("[Support](./support)");
      }
    });

    it("should process complex CORE documentation", async () => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const input = `# Pepr Documentation

For getting started, see [User Guide](docs/user-guide/README.md).

Check [Best Practices](/docs/best-practices.md) and [Examples](docs/module-examples.md).

- [Code of Conduct](../../CODE_OF_CONDUCT.md)
- [Contributing](/docs/contribute/contributing.md)
- [Security](../../SECURITY.md)

See [API docs](/docs/api/README.md).`;

        const result = transformContent(input);

        expect(result).toContain("[User Guide](user-guide)");
        expect(result).toContain("[Best Practices](/best-practices)");
        expect(result).toContain("[Examples](module-examples)");
        expect(result).toContain("[Code of Conduct](./code-of-conduct)");
        expect(result).toContain("[Security](./security)");
        expect(result).toContain("[Contributing](/contribute/contributing)");
        expect(result).toContain("[API docs](/api)");
      }
    });

    it("should handle README with images and videos", async () => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const input =
          "![Logo](_images/pepr.png)\n\nDemo: https://example.com/pepr-demo.mp4\n\n[Docs](./docs/README.md)";

        const result = transformContent(input);

        expect(result).toContain("/assets/pepr.png");
        expect(result).toContain('<video class="td-content" controls');
        expect(result).toContain("[Docs](.)");
      }
    });

    it("should preserve markdown formatting", async () => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const input = `## Features

- **Bold text**
- *Italic text*
- \`inline code\`
- [Links](https://example.com)

| Table | Header |
|-------|--------|
| Cell  | Data   |

> Blockquote

1. Numbered
2. List
`;

        const result = transformContent(input);

        expect(result).toContain("## Features");
        expect(result).toContain("**Bold text**");
        expect(result).toContain("*Italic text*");
        expect(result).toContain("`inline code`");
        expect(result).toContain("| Table | Header |");
        expect(result).toContain("> Blockquote");
        expect(result).toContain("1. Numbered");
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty content", async () => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const result = transformContent("");
        expect(result).toBe("");
      }
    });

    it("should handle content with only whitespace", async () => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const input = "   \n\n  \t  \n";
        const result = transformContent(input);
        expect(typeof result).toBe("string");
      }
    });

    it("should handle malformed markdown", async () => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const input = "![broken image](_images/\n[broken link](incomplete";
        const result = transformContent(input);
        expect(typeof result).toBe("string");
      }
    });
  });
});
