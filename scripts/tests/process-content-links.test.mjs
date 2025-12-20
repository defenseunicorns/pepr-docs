import { describe, expect, it } from "vitest";
import { processContentLinks } from "../lib/process-content-links.mjs";

describe("processContentLinks - .md extension removal", () => {
  const testCases = [
    {
      name: "should remove .md from internal link",
      input: "See [guide](./docs.md) for info.",
      file: "README.md",
      expected: "[guide](./docs)",
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

  it.each(testCases)("$name", ({ input, file, expected }) => {
    const result = processContentLinks(input, file);
    expect(result).toContain(expected);
  });
});

describe("processContentLinks - link mapping transformations", () => {
  const testCases = [
    {
      name: "should transform pepr-tutorials to tutorials",
      input: "See [tutorial](](/pepr-tutorials/intro.md).",
      file: "index.md",
      expected: "](/tutorials/intro)",
    },
    {
      name: "should transform best-practices to reference/best-practices",
      input: "Read [guide](](/best-practices/security.md).",
      file: "index.md",
      expected: "](/reference/best-practices/security)",
    },
    {
      name: "should transform module-examples to reference/module-examples",
      input: "Check [examples](](/module-examples/basic.md).",
      file: "index.md",
      expected: "](/reference/module-examples/basic)",
    },
    {
      name: "should transform faq to reference/faq",
      input: "See [FAQ](](/faq/common.md).",
      file: "index.md",
      expected: "](/reference/faq/common)",
    },
    {
      name: "should transform user-guide/actions to actions",
      input: "View [actions](](/user-guide/actions/mutate.md).",
      file: "index.md",
      expected: "](/actions/mutate)",
    },
  ];

  it.each(testCases)("$name", ({ input, file, expected }) => {
    const result = processContentLinks(input, file);
    expect(result).toContain(expected);
  });
});

describe("processContentLinks - relative link adjustment based on file type", () => {
  const testCases = [
    {
      name: "should NOT adjust relative links for README.md files",
      input: "See [guide](../docs/intro) and [local](./file).",
      file: "README.md",
      expectedContains: ["](../docs/intro)", "](./file)"],
      expectedNotContains: ["](../../docs/intro)", "](../file)"],
    },
    {
      name: "should adjust ../ to ../../ for non-README files",
      input: "See [guide](../docs/intro).",
      file: "user-guide/getting-started.md",
      expectedContains: ["](../../docs/intro)"],
      expectedNotContains: ["](../docs/intro)"],
    },
    {
      name: "should adjust ./ to ../ for non-README files",
      input: "See [local](./file).",
      file: "tutorials/basic.md",
      expectedContains: ["](../file)"],
      expectedNotContains: ["](./file)"],
    },
    {
      name: "should adjust both ./ and ../ for non-README files",
      input: "See [guide](../docs/intro) and [local](./file).",
      file: "actions/mutate.md",
      expectedContains: ["](../../docs/intro)", "](../file)"],
      expectedNotContains: ["](../docs/intro)", "](./file)"],
    },
    {
      name: "should NOT adjust relative links in nested README.md",
      input: "See [guide](../intro) and [local](./setup).",
      file: "user-guide/README.md",
      expectedContains: ["](../intro)", "](./setup)"],
      expectedNotContains: ["](../../intro)", "](../setup)"],
    },
  ];

  it.each(testCases)("$name", ({ input, file, expectedContains, expectedNotContains }) => {
    const result = processContentLinks(input, file);

    expectedContains.forEach(expected => {
      expect(result).toContain(expected);
    });

    expectedNotContains.forEach(notExpected => {
      expect(result).not.toContain(notExpected);
    });
  });
});
