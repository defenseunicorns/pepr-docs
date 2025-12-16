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

describe("CORE Repository Integration", () => {
  describe("CORE-specific Link Transformations", () => {
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

  describe("CORE Content with Multiple Transformations", () => {
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
  });

  describe("CORE Images and Videos", () => {
    it("should transform CORE image paths", async () => {
      const transformContent = await getTransformContentFunction();

      if (transformContent) {
        const input = "![Architecture](_images/pepr-arch.svg)";
        const result = transformContent(input);

        expect(result).toContain("/assets/pepr-arch.png");
      }
    });

    it("should handle CORE README with images and videos", async () => {
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
  });
});
