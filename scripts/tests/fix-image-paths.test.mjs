import { describe, expect, it } from "vitest";
import { fixImagePaths } from "../lib/fix-image-paths.mjs";

describe("fixImagePaths - table", () => {
  const testCases = [
    {
      name: "should convert _images/pepr-arch.png to assets path",
      input: "See the ![architecture](_images/pepr-arch.png) diagram",
      expected: "/assets/pepr-arch.png",
    },
    {
      name: "should not contain original _images/pepr-arch.png",
      input: "See the ![architecture](_images/pepr-arch.png) diagram",
      expected: "_images/pepr-arch.png",
    },
    {
      name: "should convert relative _images paths to assets",
      input: "![test](../../_images/test.png)",
      expected: "/assets/test.png",
    },
    {
      name: "should convert resources light theme to assets",
      input: "![demo](resources/create-pepr-operator/light.png)",
      expected: "/assets/light.png",
    },
    {
      name: "should convert resources dark theme to assets",
      input: "![demo](resources/create-pepr-operator/dark.png)",
      expected: "/assets/dark.png",
    },
    {
      name: "should convert _images/pepr-arch.png in multi-image content",
      input:
        "![arch](_images/pepr-arch.png)\n![logo](_images/pepr.png)\n![demo](resources/create-pepr-operator/dark.png)\n![other](../../_images/other.png)",
      expected: "/assets/pepr-arch.png",
    },
    {
      name: "should convert _images/pepr.png in multi-image content",
      input:
        "![arch](_images/pepr-arch.png)\n![logo](_images/pepr.png)\n![demo](resources/create-pepr-operator/dark.png)\n![other](../../_images/other.png)",
      expected: "/assets/pepr.png",
    },
    {
      name: "should convert resources dark.png in multi-image content",
      input:
        "![arch](_images/pepr-arch.png)\n![logo](_images/pepr.png)\n![demo](resources/create-pepr-operator/dark.png)\n![other](../../_images/other.png)",
      expected: "/assets/dark.png",
    },
    {
      name: "should convert relative other.png in multi-image content",
      input:
        "![arch](_images/pepr-arch.png)\n![logo](_images/pepr.png)\n![demo](resources/create-pepr-operator/dark.png)\n![other](../../_images/other.png)",
      expected: "/assets/other.png",
    },
    {
      name: "should preserve external URLs",
      input: "![external](https://example.com/image.png) and ![local](_images/pepr.png)",
      expected: "https://example.com/image.png",
    },
    {
      name: "should convert local paths in mixed content",
      input: "![external](https://example.com/image.png) and ![local](_images/pepr.png)",
      expected: "/assets/pepr.png",
    },
  ];

  it.each(testCases)("$name", ({ name, input, expected }) => {
    const result = fixImagePaths(input);

    if (name.includes("should not contain")) {
      expect(result).not.toContain(expected);
    } else {
      expect(result).toContain(expected);
    }
  });
});
