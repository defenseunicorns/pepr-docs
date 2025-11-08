import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";

async function getProcessContentLinksFunction() {
  const buildScript = await fs.readFile("index.mjs", "utf8");

  const hasNumericMatch = buildScript.match(
    /function hasNumericPrefix\(str\) \{\s*return ([^}]+);\s*\}/,
  );
  const fixImageMatch = buildScript.match(/function fixImagePaths\(content\) \{([\s\S]*?)^\}/m);
  const removeHtmlMatch = buildScript.match(
    /function removeHtmlComments\(input\) \{([\s\S]*?)^\}/m,
  );
  const transformContentMatch = buildScript.match(
    /const transformContent = content => \{([\s\S]*?)^\};/m,
  );
  const linkMappingsMatch = buildScript.match(/const LINK_MAPPINGS = \{([\s\S]*?)^\};/m);
  const processContentLinksMatch = buildScript.match(
    /const processContentLinks = \(content, file\) => \{([\s\S]*?)^\};/m,
  );

  if (
    hasNumericMatch &&
    fixImageMatch &&
    removeHtmlMatch &&
    transformContentMatch &&
    linkMappingsMatch &&
    processContentLinksMatch
  ) {
    return new Function(
      "content",
      "file",
      `
			const path = { basename: (filePath) => filePath.split('/').pop() };
			const hasNumericPrefix = (str) => { return ${hasNumericMatch[1]}; };
			const fixImagePaths = (content) => { ${fixImageMatch[1]} };
			const removeHtmlComments = (input) => { ${removeHtmlMatch[1]} };
			const transformContent = (content) => { ${transformContentMatch[1]} };
			const LINK_MAPPINGS = { ${linkMappingsMatch[1]} };
			${processContentLinksMatch[1]}
		`,
    );
  }
  return null;
}

describe("processContentLinks - .md extension removal", () => {
  const testCases = [
    {
      name: "should remove .md from internal link and add trailing slash",
      input: "See [guide](./docs.md) for info.",
      file: "README.md",
      expected: "[guide](./docs/)",
    },
    {
      name: "should remove .md and preserve anchor",
      input: "See [section](./docs.md#intro).",
      file: "README.md",
      expected: "[section](./docs#intro)",
    },
    {
      name: "should not modify https URLs with .md",
      input: "Download [file](https://example.com/doc.md).",
      file: "index.md",
      expected: "[file](https://example.com/doc.md)",
    },
    {
      name: "should not modify http URLs with .md",
      input: "See [docs](http://site.com/guide.md).",
      file: "index.md",
      expected: "[docs](http://site.com/guide.md)",
    },
  ];

  it.each(testCases)("$name", async ({ input, file, expected, expectMultiple }) => {
    const processContentLinks = await getProcessContentLinksFunction();
    const result = processContentLinks(input, file);

    if (expectMultiple) {
      expectMultiple.forEach(exp => expect(result).toContain(exp));
    } else {
      expect(result).toContain(expected);
    }
  });
});

describe("processContentLinks - link mapping transformations", () => {
  const testCases = [
    {
      name: "should transform pepr-tutorials to tutorials",
      input: "See [tutorial](](/pepr-tutorials/intro.md).",
      file: "index.md",
      expected: "](/tutorials/intro/)",
    },
    {
      name: "should transform best-practices to reference/best-practices",
      input: "Read [guide](](/best-practices/security.md).",
      file: "index.md",
      expected: "](/reference/best-practices/security/)",
    },
    {
      name: "should transform module-examples to reference/module-examples",
      input: "Check [examples](](/module-examples/basic.md).",
      file: "index.md",
      expected: "](/reference/module-examples/basic/)",
    },
    {
      name: "should transform faq to reference/faq",
      input: "See [FAQ](](/faq/common.md).",
      file: "index.md",
      expected: "](/reference/faq/common/)",
    },
    {
      name: "should transform user-guide/actions to actions",
      input: "View [actions](](/user-guide/actions/mutate.md).",
      file: "index.md",
      expected: "](/actions/mutate/)",
    },
  ];

  it.each(testCases)("$name", async ({ input, file, expected }) => {
    const processContentLinks = await getProcessContentLinksFunction();
    const result = processContentLinks(input, file);
    expect(result).toContain(expected);
  });
});
