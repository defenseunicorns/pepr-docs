// Partially needed for backward compatibility with old git tags (v1.0.2, v0.55.6) that still use numbered prefixes

import { describe, expect, it } from "vitest";
import { generateFrontMatter } from "../lib/frontmatter.mjs";

describe("frontmatter", () => {
  describe("generateFrontMatter", () => {
    it("should generate frontmatter for latest version without slug", () => {
      const content = "# Getting Started\n\nThis is the guide...";
      const version = "latest";
      const newfile = "user-guide/getting-started.md";

      const result = generateFrontMatter(content, newfile, version);

      expect(result.front).toContain("title: Getting Started");
      expect(result.front).toContain("description: Getting Started");
      expect(result.front).not.toContain("slug:");
      expect(result.contentWithoutHeading).not.toContain("# Getting Started");
      expect(result.contentWithoutHeading).toContain("This is the guide...");
    });

    it("should generate frontmatter for versioned content with slug", () => {
      const content = "# Getting Started\n\nThis is the guide...";
      const version = "v1.2.3";
      const newfile = "user-guide/getting-started.md";

      const result = generateFrontMatter(content, newfile, version);

      expect(result.front).toContain("title: Getting Started");
      expect(result.front).toContain("slug: v1.2/user-guide/getting-started");
    });

    it("should generate Overview title for README files", () => {
      const content = "# User Guide\n\nOverview content...";
      const newfile = "user-guide/index.md";
      const originalFile = "user-guide/README.md";

      const result = generateFrontMatter(content, newfile, "latest", originalFile);

      expect(result.front).toContain("title: Overview");
      expect(result.front).toContain("description: Overview");
    });

    it("should include sidebar label for README files", () => {
      const content = "# User Guide\n\nOverview content...";
      const newfile = "user-guide/index.md";
      const originalFile = "README.md";

      const result = generateFrontMatter(content, newfile, "latest", originalFile);

      expect(result.front).toContain("sidebar:");
      expect(result.front).toContain("label: Overview");
    });

    it("should not include sidebar label for non-README files", () => {
      const content = "# Getting Started\n\nContent...";
      const newfile = "user-guide/getting-started.md";

      const result = generateFrontMatter(content, newfile, "latest");

      expect(result.front).not.toContain("sidebar:");
    });

    it("should strip colons and backticks from titles", () => {
      const content = "# Getting Started: The `Basics`\n\nContent...";
      const newfile = "user-guide/getting-started.md";

      const result = generateFrontMatter(content, newfile, "latest");

      expect(result.front).toContain("title: Getting Started The Basics");
      expect(result.front).toContain("description: Getting Started The Basics");
      // Title value shouldn't have colons or backticks (but YAML keys will have colons)
      expect(result.front).not.toMatch(/title:.*[:``]/);
    });

    it("should handle version slug for root index files", () => {
      const content = "# Pepr\n\nDocumentation...";
      const version = "v1.2.3";
      const newfile = "index.md";

      const result = generateFrontMatter(content, newfile, version);

      expect(result.front).toContain("slug: v1.2");
      // Root index produces "slug: v1.2/index" which is acceptable
      expect(result.front).toMatch(/slug: v1\.2(\/index)?$/m);
    });

    it("should convert patch version to minor in slug", () => {
      const content = "# Guide\n\nContent...";
      const version = "v2.5.8";
      const newfile = "guide.md";

      const result = generateFrontMatter(content, newfile, version);

      expect(result.front).toContain("slug: v2.5/guide");
    });

    it("should handle newfile ending with /README.md", () => {
      const content = "# Tutorials\n\nOverview...";
      const newfile = "tutorials/README.md";

      const result = generateFrontMatter(content, newfile, "latest");

      expect(result.front).toContain("title: Overview");
      expect(result.front).toContain("sidebar:");
    });

    it("should handle newfile that is exactly README.md", () => {
      const content = "# Main\n\nOverview...";
      const newfile = "README.md";

      const result = generateFrontMatter(content, newfile, "latest");

      expect(result.front).toContain("title: Overview");
      expect(result.front).toContain("sidebar:");
    });

    it("should remove heading from content", () => {
      const content = "# Getting Started\n\nLine 1\nLine 2";
      const newfile = "guide.md";

      const result = generateFrontMatter(content, newfile, "latest");

      expect(result.contentWithoutHeading).toBe("\n\nLine 1\nLine 2");
      expect(result.contentWithoutHeading).not.toContain("# Getting Started");
    });
  });
});
