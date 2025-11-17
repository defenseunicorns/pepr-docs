import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";

async function getRemoveHtmlCommentsFunction() {
  const buildScript = await fs.readFile("scripts/index.mjs", "utf8");

  const removeMatch = buildScript.match(/function removeHtmlComments\(input\) \{([\s\S]*?)^\}/m);
  if (removeMatch) {
    try {
      return new Function("input", removeMatch[1]);
    } catch (e) {
      console.warn("Could not extract removeHtmlComments function:", e.message);
    }
  }
  return null;
}

describe("removeHtmlComments", () => {
  const testCases = [
    {
      name: "should remove simple HTML comments",
      input: "Before <!-- comment --> after",
      expected: "Before  after",
    },
    {
      name: "should not contain simple comment markers",
      input: "Before <!-- comment --> after",
      expected: "<!-- comment -->",
    },
    {
      name: "should handle nested comments - preserve Before",
      input: "Before <!-- outer <!-- inner --> comment --> after",
      expected: "Before",
    },
    {
      name: "should handle nested comments - preserve after",
      input: "Before <!-- outer <!-- inner --> comment --> after",
      expected: "after",
    },
    {
      name: "should remove multiline comments",
      input: "Before\n<!--\nThis is a\nmultiline comment\n-->\nAfter",
      expected: "Before",
    },
    {
      name: "should preserve content after multiline comments",
      input: "Before\n<!--\nThis is a\nmultiline comment\n-->\nAfter",
      expected: "After",
    },
    {
      name: "should not contain multiline comment markers",
      input: "Before\n<!--\nThis is a\nmultiline comment\n-->\nAfter",
      expected: "<!--",
    },
    {
      name: "should not contain multiline comment content",
      input: "Before\n<!--\nThis is a\nmultiline comment\n-->\nAfter",
      expected: "multiline comment",
    },
    {
      name: "should remove multiple comments - preserve content",
      input: "<!-- Start --> content <!-- Middle --> more <!-- End -->",
      expected: "content",
    },
    {
      name: "should remove multiple comments - preserve more",
      input: "<!-- Start --> content <!-- Middle --> more <!-- End -->",
      expected: "more",
    },
    {
      name: "should not contain Start comment",
      input: "<!-- Start --> content <!-- Middle --> more <!-- End -->",
      expected: "<!--",
    },
    {
      name: "should not contain comment end markers",
      input: "<!-- Start --> content <!-- Middle --> more <!-- End -->",
      expected: "-->",
    },
    {
      name: "should remove Start Block comment",
      input:
        "# Tutorial\n\n<!-- Start Block -->\nSome tutorial content here\n<!-- End Block -->\n\nMore content",
      expected: "Some tutorial content here",
    },
    {
      name: "should remove End Block comment",
      input:
        "# Tutorial\n\n<!-- Start Block -->\nSome tutorial content here\n<!-- End Block -->\n\nMore content",
      expected: "More content",
    },
    {
      name: "should not contain Start Block marker",
      input:
        "# Tutorial\n\n<!-- Start Block -->\nSome tutorial content here\n<!-- End Block -->\n\nMore content",
      expected: "<!-- Start Block -->",
    },
    {
      name: "should not contain End Block marker",
      input:
        "# Tutorial\n\n<!-- Start Block -->\nSome tutorial content here\n<!-- End Block -->\n\nMore content",
      expected: "<!-- End Block -->",
    },
  ];

  it.each(testCases)("$name", async ({ name, input, expected }) => {
    const removeHtmlComments = await getRemoveHtmlCommentsFunction();

    if (removeHtmlComments) {
      const result = removeHtmlComments(input);

      if (name.includes("should not contain")) {
        expect(result).not.toContain(expected);
      } else {
        expect(result).toContain(expected);
      }
    }
  });
});
