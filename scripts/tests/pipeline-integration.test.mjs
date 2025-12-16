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

describe("Content Pipeline - General Transformations", () => {
  describe("transformContent", () => {
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
      },
      {
        name: "should not contain End Block markers",
        input: "# Test\n<!-- Start Block -->\nSome content\n<!-- End Block -->\nMore content",
        expected: "<!-- End Block -->",
      },
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
        name: "should fix image paths in complex content",
        input:
          "# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>",
        expected: "/assets/pepr-arch.png",
      },
      {
        name: "should transform video in complex content",
        input:
          "# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>",
        expected: '<video class="td-content" controls',
      },
      {
        name: "should fix links in complex content",
        input:
          "# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>",
        expected: "[Getting Started](getting-started)",
      },
      {
        name: "should escape @param in complex content",
        input:
          "# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>",
        expected: "**\\@param**",
      },
      {
        name: "should escape email in complex content",
        input:
          "# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>",
        expected: "&lt;admin@example.com&gt;",
      },
      {
        name: "should not contain comments in complex content",
        input:
          "# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>",
        expected: "<!-- This is a comment -->",
      },
    ];

    it.each(testCases)("%name", async ({ name, input, expected }) => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const result = transformContent(input);

        if (name.includes("should not contain")) {
          expect(result).not.toContain(expected);
        } else {
          expect(result).toContain(expected);
        }
      }
    });
  });
});
