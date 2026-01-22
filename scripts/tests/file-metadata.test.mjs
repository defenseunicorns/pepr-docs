import { describe, expect, it } from "vitest";
import { generateFileMetadata, PATH_MAPPINGS } from "../lib/file-metadata.mjs";

describe("file-metadata", () => {
  describe("generateFileMetadata", () => {
    it("should strip numbered prefixes from directories", () => {
      const result = generateFileMetadata("user-guide/getting-started.md");
      expect(result.newfile).toBe("user-guide/getting-started.md");
    });

    it("should strip numbered prefixes from nested directories", () => {
      const result = generateFileMetadata("user-guide/advanced/config.md");
      expect(result.newfile).toBe("user-guide/advanced/config.md");
    });

    it("should strip numbered prefixes from filenames", () => {
      const result = generateFileMetadata("user-guide/070_getting-started.md");
      expect(result.newfile).toBe("user-guide/getting-started.md");
    });

    it("should convert README.md to index.md", () => {
      const result = generateFileMetadata("user-guide/README.md");
      expect(result.newfile).toBe("user-guide/index.md");
    });

    it("should apply structure mappings", () => {
      const result = generateFileMetadata("pepr-tutorials/getting-started.md");
      expect(result.newfile).toBe("tutorials/getting-started.md");
    });

    it("should apply user-guide/actions structure mapping", () => {
      const result = generateFileMetadata("user-guide/actions/mutate.md");
      expect(result.newfile).toBe("actions/mutate.md");
    });

    it("should map best-practices README to single file", () => {
      const result = generateFileMetadata("best-practices/README.md");
      expect(result.newfile).toBe("reference/best-practices.md");
    });

    it("should map module-examples README to single file", () => {
      const result = generateFileMetadata("module-examples/README.md");
      expect(result.newfile).toBe("reference/module-examples.md");
    });

    it("should map faq README to single file", () => {
      const result = generateFileMetadata("faq/README.md");
      expect(result.newfile).toBe("reference/faq.md");
    });

    it("should map roadmap README to single file", () => {
      const result = generateFileMetadata("roadmap/README.md");
      expect(result.newfile).toBe("roadmap.md");
    });

    it("should handle files in root directory", () => {
      const result = generateFileMetadata("getting-started.md");
      expect(result.newfile).toBe("getting-started.md");
    });

    it("should handle complex path transformations", () => {
      const result = generateFileMetadata("pepr-tutorials/advanced.md");
      expect(result.newfile).toBe("tutorials/advanced.md");
    });
  });

  describe("PATH_MAPPINGS", () => {
    it("should have structure mappings defined", () => {
      expect(PATH_MAPPINGS.structure).toBeDefined();
      expect(PATH_MAPPINGS.structure["pepr-tutorials"]).toBe("tutorials");
      expect(PATH_MAPPINGS.structure["user-guide/actions"]).toBe("actions");
    });

    it("should have single file mappings defined", () => {
      expect(PATH_MAPPINGS.singleFile).toBeDefined();
      expect(PATH_MAPPINGS.singleFile["best-practices"]).toBe("reference/best-practices.md");
      expect(PATH_MAPPINGS.singleFile["module-examples"]).toBe("reference/module-examples.md");
      expect(PATH_MAPPINGS.singleFile.faq).toBe("reference/faq.md");
      expect(PATH_MAPPINGS.singleFile.roadmap).toBe("roadmap.md");
    });
  });
});
