import { describe, expect, it } from "vitest";
import * as path from "node:path";

describe("CORE Processing", () => {
  // ============================================================================
  // COMMON SECTIONS (mirrored in examples-processing.test.mjs)
  // ============================================================================

  describe("Title Extraction", () => {
    it("should extract title from first heading", () => {
      const content = "# Getting Started\n\nThis is the content...";
      const headingMatch = content.match(/#[\s]+(.*)/);
      const title = headingMatch[1];

      expect(title).toBe("Getting Started");
    });

    it("should handle headings with colons", () => {
      const content = "# Getting Started: A Guide\n\nContent...";
      const headingMatch = content.match(/#[\s]+(.*)/);
      const title = headingMatch[1].replaceAll(/[`:]/g, "");

      expect(title).toBe("Getting Started A Guide");
    });

    it("should handle headings with backticks", () => {
      const content = "# Using `pepr` CLI\n\nContent...";
      const headingMatch = content.match(/#[\s]+(.*)/);
      const title = headingMatch[1].replaceAll(/[`:]/g, "");

      expect(title).toBe("Using pepr CLI");
    });

    it("should handle headings with both colons and backticks", () => {
      const content = "# API: `PeprModule`\n\nContent...";
      const headingMatch = content.match(/#[\s]+(.*)/);
      const title = headingMatch[1].replaceAll(/[`:]/g, "");

      expect(title).toBe("API PeprModule");
    });
  });

  describe("Heading Removal", () => {
    it("should remove first heading from content", () => {
      const content = "# Getting Started\n\nThis is the content...";
      const heading = content.match(/#[\s]+(.*)/);
      const contentWithoutHeading = content.replaceAll(heading[0], "");

      expect(contentWithoutHeading).not.toContain("# Getting Started");
      expect(contentWithoutHeading).toContain("This is the content...");
    });

    it("should preserve subheadings", () => {
      const content = "# Main Title\n\n## Subtitle\n\nContent";
      const heading = content.match(/#[\s]+(.*)/);
      const contentWithoutHeading = content.replaceAll(heading[0], "");

      expect(contentWithoutHeading).toContain("## Subtitle");
    });

    it("should preserve content structure", () => {
      const content = "# Title\n\n- Item 1\n- Item 2\n\n## Section";
      const heading = content.match(/#[\s]+(.*)/);
      const contentWithoutHeading = content.replaceAll(heading[0], "");

      expect(contentWithoutHeading).toContain("- Item 1");
      expect(contentWithoutHeading).toContain("- Item 2");
      expect(contentWithoutHeading).toContain("## Section");
    });
  });

  describe("Path/Slug Generation", () => {
    it("should generate path from filename", () => {
      const file = "user-guide/getting-started.md";
      const dir = path.dirname(file);
      const filename = path.basename(file);
      const newpath = `${dir}/${filename}`;

      expect(newpath).toBe("user-guide/getting-started.md");
    });

    it("should convert README.md to index.md", () => {
      const filename = "README.md";
      const newfile = filename === "README.md" ? "index.md" : filename;

      expect(newfile).toBe("index.md");
    });

    it("should preserve non-README filenames", () => {
      const filename = "getting-started.md";
      const newfile = filename === "README.md" ? "index.md" : filename;

      expect(newfile).toBe("getting-started.md");
    });
  });

  describe("Frontmatter Generation", () => {
    function generateFrontMatter(content, newfile, version, originalFile = "") {
      const heading = content.match(/#[\s]+(.*)/);
      const isReadme =
        originalFile.endsWith("README.md") ||
        newfile.endsWith("/README.md") ||
        newfile === "README.md";
      const title = isReadme ? "Overview" : heading[1].replaceAll(/[`:]/g, "");

      const slug =
        version !== "latest"
          ? `\nslug: ${version.replace(/^v(\d+\.\d+)\.\d+$/, "v$1")}${
              newfile
                .replace(/\.md$/, "")
                .replace(/\/index$/, "")
                .replace(/^\/+|\/+$/g, "")
                ? `/${newfile
                    .replace(/\.md$/, "")
                    .replace(/\/index$/, "")
                    .replace(/^\/+|\/+$/g, "")}`
                : ""
            }`
          : "";

      const sidebarLabel = isReadme ? "\nsidebar:\n  label: Overview" : "";

      return {
        front: `---\ntitle: ${title}\ndescription: ${title}${slug}${sidebarLabel}\n---`,
        contentWithoutHeading: content.replaceAll(heading[0], ""),
      };
    }

    it("should generate frontmatter with title from heading", () => {
      const content = "# Getting Started\n\nThis is the content...";
      const { front } = generateFrontMatter(content, "user-guide/getting-started.md", "latest");

      expect(front).toContain("title: Getting Started");
      expect(front).toContain("description: Getting Started");
    });

    it("should generate Overview title for README files", () => {
      const content = "# User Guide\n\nThis is the user guide...";
      const { front } = generateFrontMatter(
        content,
        "user-guide/index.md",
        "latest",
        "user-guide/README.md",
      );

      expect(front).toContain("title: Overview");
      expect(front).toContain("description: Overview");
    });

    it("should add sidebar label for README files", () => {
      const content = "# User Guide\n\nThis is the user guide...";
      const { front } = generateFrontMatter(
        content,
        "user-guide/index.md",
        "latest",
        "user-guide/README.md",
      );

      expect(front).toContain("sidebar:");
      expect(front).toContain("label: Overview");
    });

    it("should not add sidebar label for non-README files", () => {
      const content = "# Getting Started\n\nThis is the content...";
      const { front } = generateFrontMatter(content, "user-guide/getting-started.md", "latest");

      expect(front).not.toContain("sidebar:");
    });

    it("should generate slug for versioned content", () => {
      const content = "# Getting Started\n\nThis is the content...";
      const { front } = generateFrontMatter(content, "user-guide/getting-started.md", "v1.2.3");

      expect(front).toContain("slug: v1.2/user-guide/getting-started");
    });

    it("should not generate slug for latest version", () => {
      const content = "# Getting Started\n\nThis is the content...";
      const { front } = generateFrontMatter(content, "user-guide/getting-started.md", "latest");

      expect(front).not.toContain("slug:");
    });

    it("should remove heading from content", () => {
      const content = "# Getting Started\n\nThis is the content...";
      const { contentWithoutHeading } = generateFrontMatter(
        content,
        "user-guide/getting-started.md",
        "latest",
      );

      expect(contentWithoutHeading).not.toContain("# Getting Started");
      expect(contentWithoutHeading).toContain("This is the content...");
    });

    it("should strip colons from title", () => {
      const content = "# Getting Started: A Guide\n\nContent...";
      const { front } = generateFrontMatter(content, "user-guide/getting-started.md", "latest");

      expect(front).toContain("title: Getting Started A Guide");
    });

    it("should strip backticks from title", () => {
      const content = "# Using `pepr` CLI\n\nContent...";
      const { front } = generateFrontMatter(content, "user-guide/pepr-cli.md", "latest");

      expect(front).toContain("title: Using pepr CLI");
    });

    it("should handle index.md without originalFile parameter", () => {
      const content = "# User Guide\n\nThis is the user guide...";
      const { front } = generateFrontMatter(content, "user-guide/index.md", "latest");

      expect(front).not.toContain("sidebar:");
    });

    it("should generate correct slug for index files with version", () => {
      const content = "# Overview\n\nThis is the overview...";
      const { front } = generateFrontMatter(
        content,
        "user-guide/index.md",
        "v1.2.3",
        "user-guide/README.md",
      );

      expect(front).toContain("slug: v1.2/user-guide");
    });

    it("should handle root index file", () => {
      const content = "# Pepr Documentation\n\nWelcome...";
      const { front } = generateFrontMatter(content, "index.md", "v1.2.3", "README.md");

      expect(front).toContain("slug: v1.2");
      expect(front).toContain("title: Overview");
    });
  });

  describe("Complete Processing Pipeline", () => {
    it("should process file from docs/ with numbered prefixes", () => {
      const file = "010_user-guide/070_pepr-cli.md";
      const content = "# Pepr CLI\n\nThis is the CLI guide...";

      // Simulate the full processing
      function generateFileMetadata(file) {
        const filename = path.basename(file);
        const dir = path.dirname(file);
        const cleanDir = dir.replace(/^\d+_/, "").replace(/\/\d+_/g, "/");
        let newfile = filename.replace(/^\d+_/, "");
        return { newfile: cleanDir ? `${cleanDir}/${newfile}` : newfile };
      }

      const { newfile } = generateFileMetadata(file);
      expect(newfile).toBe("user-guide/pepr-cli.md");
    });

    it("should process README.md and convert to index.md with Overview title", () => {
      const file = "010_user-guide/README.md";
      const content = "# User Guide\n\nWelcome to the user guide...";

      function generateFileMetadata(file) {
        const filename = path.basename(file);
        const dir = path.dirname(file);
        const cleanDir = dir.replace(/^\d+_/, "");
        let newfile = filename === "README.md" ? "index.md" : filename;
        return { newfile: cleanDir ? `${cleanDir}/${newfile}` : newfile };
      }

      function generateFrontMatter(content, newfile, originalFile) {
        const isReadme = originalFile.endsWith("README.md");
        const title = isReadme ? "Overview" : "User Guide";
        return { front: `---\ntitle: ${title}\n---` };
      }

      const { newfile } = generateFileMetadata(file);
      const { front } = generateFrontMatter(content, newfile, file);

      expect(newfile).toBe("user-guide/index.md");
      expect(front).toContain("title: Overview");
    });
  });

  // ============================================================================
  // CORE-SPECIFIC SECTIONS
  // ============================================================================

  describe("Numbered Prefix Stripping", () => {
    it.each([
      { input: "010_user-guide", expected: "user-guide", description: "directory" },
      { input: "070_pepr-cli.md", expected: "pepr-cli.md", description: "filename" },
      {
        input: "040_pepr-tutorials",
        expected: "pepr-tutorials",
        description: "directory with multiple digits",
      },
      { input: "user-guide", expected: "user-guide", description: "no prefix" },
    ])("should strip numbered prefix from $description", ({ input, expected }) => {
      const cleaned = input.replace(/^\d+_/, "");
      expect(cleaned).toBe(expected);
    });
  });

  describe("Path Mappings", () => {
    function generateFileMetadata(file) {
      const [dir, filename] = [path.dirname(file), path.basename(file)];
      const parts = dir.split("/");
      const parent = parts.pop();
      const ancestors = parts.join("/");

      // Strip numbered prefixes from directory parts
      const cleanParent = parent.replace(/^\d+_/, "");
      const cleanAncestors = ancestors
        .split("/")
        .map(p => p.replace(/^\d+_/, ""))
        .join("/");

      let rawdir = cleanAncestors ? `${cleanAncestors}/${cleanParent}` : cleanParent;

      // Path mappings
      const PATH_MAPPINGS = {
        structure: { "pepr-tutorials": "tutorials", "user-guide/actions": "actions" },
        singleFile: {
          "best-practices": "reference/best-practices.md",
          "module-examples": "reference/module-examples.md",
          faq: "reference/faq.md",
          roadmap: "roadmap.md",
        },
      };

      // Apply structure mappings
      let newdir = Object.entries(PATH_MAPPINGS.structure).reduce(
        (dir, [old, new_]) => (dir.startsWith(old) ? dir.replace(old, new_) : dir),
        rawdir,
      );

      // Process filename - strip numbered prefix
      let newfile = filename.replace(/^\d+_/, "");
      if (newfile === "README.md") {
        newfile = "index.md";
      }

      // Handle single file mappings
      if (newfile === "index.md" && PATH_MAPPINGS.singleFile[rawdir]) {
        [newdir, newfile] = ["", PATH_MAPPINGS.singleFile[rawdir]];
      }

      return { newfile: newdir && newdir !== "." ? `${newdir}/${newfile}` : newfile };
    }

    describe("Structure Mappings", () => {
      it("should map pepr-tutorials to tutorials", () => {
        const file = "040_pepr-tutorials/getting-started.md";
        const { newfile } = generateFileMetadata(file);

        expect(newfile).toBe("tutorials/getting-started.md");
      });

      it("should map user-guide/actions to actions", () => {
        const file = "010_user-guide/020_actions/mutate.md";
        const { newfile } = generateFileMetadata(file);

        expect(newfile).toBe("actions/mutate.md");
      });
    });

    describe("Single File Mappings", () => {
      it.each([
        {
          file: "best-practices/README.md",
          expected: "reference/best-practices.md",
          name: "best-practices",
        },
        { file: "faq/README.md", expected: "reference/faq.md", name: "faq" },
        {
          file: "module-examples/README.md",
          expected: "reference/module-examples.md",
          name: "module-examples",
        },
        { file: "roadmap/README.md", expected: "roadmap.md", name: "roadmap" },
      ])("should apply single file mapping for $name", ({ file, expected }) => {
        const { newfile } = generateFileMetadata(file);
        expect(newfile).toBe(expected);
      });
    });
  });

  describe("Root Markdown File Mappings", () => {
    const ROOT_MD_MAPPINGS = [
      { sources: ["SECURITY.md"], target: "090_community/security.md" },
      { sources: ["CODE-OF-CONDUCT.md"], target: "100_contribute/code-of-conduct.md" },
      { sources: ["SUPPORT.md"], target: "090_community/support.md" },
    ];

    it.each([
      { source: "SECURITY.md", expected: "090_community/security.md", directory: "community" },
      {
        source: "CODE-OF-CONDUCT.md",
        expected: "100_contribute/code-of-conduct.md",
        directory: "contribute",
      },
      { source: "SUPPORT.md", expected: "090_community/support.md", directory: "community" },
    ])("should map $source to $directory directory", ({ source, expected }) => {
      const mapping = ROOT_MD_MAPPINGS.find(m => m.sources.includes(source));
      expect(mapping.target).toBe(expected);
    });

    it("should handle all three root community files", () => {
      expect(ROOT_MD_MAPPINGS.length).toBe(3);
    });
  });

  describe("Source File Filtering", () => {
    function filterSourceFiles(files) {
      // Process only .md files, but not non-root README.md
      return files.filter(f => f.endsWith(".md")).filter(f => !(f === "README.md"));
    }

    it("should include .md files", () => {
      const files = ["getting-started.md", "pepr-cli.md", "index.js"];
      const filtered = filterSourceFiles(files);

      expect(filtered).toContain("getting-started.md");
      expect(filtered).toContain("pepr-cli.md");
    });

    it("should exclude non-.md files", () => {
      const files = ["getting-started.md", "index.js", "config.json"];
      const filtered = filterSourceFiles(files);

      expect(filtered).not.toContain("index.js");
      expect(filtered).not.toContain("config.json");
    });

    it("should exclude root README.md", () => {
      const files = ["README.md", "getting-started.md"];
      const filtered = filterSourceFiles(files);

      expect(filtered).not.toContain("README.md");
      expect(filtered).toContain("getting-started.md");
    });

    it("should include README.md in subdirectories", () => {
      const files = ["user-guide/README.md", "README.md"];
      const filtered = filterSourceFiles(files);

      expect(filtered).toContain("user-guide/README.md");
      expect(filtered).not.toContain("README.md");
    });
  });

  describe("Content Link Adjustments", () => {
    function adjustRelativeLinks(content, file) {
      let result = content;

      // Adjust relative links for non-README files
      if (path.basename(file) !== "README.md") {
        result = result.replaceAll("](../", "](../../").replaceAll("](./", "](../");
      }

      return result;
    }

    it("should adjust ../ links for non-README files", () => {
      const content = "[Guide](../guide.md)";
      const result = adjustRelativeLinks(content, "user-guide/getting-started.md");

      expect(result).toBe("[Guide](../../guide.md)");
    });

    it("should adjust ./ links for non-README files", () => {
      const content = "[Mutate](./mutate.md)";
      const result = adjustRelativeLinks(content, "actions/overview.md");

      expect(result).toBe("[Mutate](../mutate.md)");
    });

    it("should not adjust links for README files", () => {
      const content = "[Guide](../guide.md) and [Mutate](./mutate.md)";
      const result = adjustRelativeLinks(content, "user-guide/README.md");

      expect(result).toBe("[Guide](../guide.md) and [Mutate](./mutate.md)");
    });

    it("should handle multiple link adjustments", () => {
      const content = "[Up](../index.md) [Same](./other.md)";
      const result = adjustRelativeLinks(content, "user-guide/getting-started.md");

      expect(result).toBe("[Up](../../index.md) [Same](../other.md)");
    });
  });

  describe("Link Mappings", () => {
    const LINK_MAPPINGS = {
      "](/pepr-tutorials/": "](/tutorials/",
      "](/best-practices/": "](/reference/best-practices/",
      "](/module-examples/": "](/reference/module-examples/",
      "](/faq/": "](/reference/faq/",
      "](/user-guide/actions/": "](/actions/",
    };

    function applyLinkMappings(content) {
      return Object.entries(LINK_MAPPINGS).reduce(
        (acc, [old, new_]) => acc.replaceAll(old, new_),
        content,
      );
    }

    it.each([
      {
        input: "[Tutorial](](/pepr-tutorials/getting-started)",
        expected: "](/tutorials/getting-started)",
        name: "pepr-tutorials to tutorials",
      },
      {
        input: "[Best Practices](](/best-practices/)",
        expected: "](/reference/best-practices/)",
        name: "best-practices to reference",
      },
      {
        input: "[Examples](](/module-examples/)",
        expected: "](/reference/module-examples/)",
        name: "module-examples to reference",
      },
      { input: "[FAQ](](/faq/)", expected: "](/reference/faq/)", name: "faq to reference" },
      {
        input: "[Actions](](/user-guide/actions/)",
        expected: "](/actions/)",
        name: "user-guide/actions to actions",
      },
    ])("should map $name", ({ input, expected }) => {
      const result = applyLinkMappings(input);
      expect(result).toContain(expected);
    });

    it("should handle multiple mappings in one content", () => {
      const content = "[Tutorial](](/pepr-tutorials/) [FAQ](](/faq/)";
      const result = applyLinkMappings(content);

      expect(result).toContain("](/tutorials/)");
      expect(result).toContain("](/reference/faq/)");
    });
  });
});
