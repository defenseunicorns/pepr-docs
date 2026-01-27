import { describe, expect, it, beforeAll } from "vitest";
import {
  discoverVersions,
  getStarlightVersions,
  findCurrentVersion,
  majmin,
} from "../lib/version-discovery.mjs";
import * as semver from "semver";

describe("Unit Tests - Helper Functions", () => {
  describe("majmin - major.minor extraction logic", () => {
    it.each([
      ["v1.2.3", "1.2"],
      ["v0.54.0", "0.54"],
      ["v0.55.1", "0.55"],
      ["1.0.0", "1.0"],
      ["2.5.10", "2.5"],
    ])("should extract major.minor from %s -> %s", (version, expected) => {
      const result = majmin(version);

      expect(result).toBe(expected);
    });
  });

  describe("findCurrentVersion - stable version filtering and sorting logic", () => {
    it("should return the most recent stable version", () => {
      const versions = ["v0.54.0", "v0.55.0", "v0.53.0", "latest"];
      const result = findCurrentVersion(versions);

      expect(result).toBe("v0.55.0");
    });

    it("should filter out 'latest'", () => {
      const versions = ["v0.54.0", "latest", "v0.55.0"];
      const result = findCurrentVersion(versions);

      expect(result).toBe("v0.55.0");
    });

    it("should filter out 'main'", () => {
      const versions = ["v0.54.0", "main", "v0.55.0"];
      const result = findCurrentVersion(versions);

      expect(result).toBe("v0.55.0");
    });

    it("should filter out prerelease versions", () => {
      const versions = ["v0.54.0", "v0.55.0-beta.1", "v0.55.0-rc.1", "v0.53.0"];
      const result = findCurrentVersion(versions);

      expect(result).toBe("v0.54.0");
    });

    it("should filter out invalid semver", () => {
      const versions = ["v0.54.0", "invalid", "not-a-version", "v0.55.0"];
      const result = findCurrentVersion(versions);

      expect(result).toBe("v0.55.0");
    });

    it("should return null when no stable versions exist", () => {
      const versions = ["latest", "main", "v0.55.0-beta.1"];
      const result = findCurrentVersion(versions);

      expect(result).toBeNull();
    });

    it("should handle empty array", () => {
      const versions = [];
      const result = findCurrentVersion(versions);

      expect(result).toBeNull();
    });

    it("should sort versions correctly and return highest", () => {
      const versions = ["v0.53.5", "v0.54.1", "v0.54.0", "v0.55.0", "v0.52.0"];
      const result = findCurrentVersion(versions);

      expect(result).toBe("v0.55.0");
    });
  });
});

describe("Integration Tests - Git Operations", () => {
  let coreRepoPath;

  beforeAll(() => {
    coreRepoPath = process.env.CORE;
    if (!coreRepoPath) {
      throw new Error("CORE environment variable must be set");
    }
  });

  describe("discoverVersions - version discovery and categorization", () => {
    it("should respect cutoff parameter for version slicing", async () => {
      const cutoff = 2;
      const { versions } = await discoverVersions(coreRepoPath, cutoff);
      const versionCount = versions.filter(v => v !== "latest").length;
      expect(versionCount).toBe(cutoff);
    });

    it('should include "latest" in active versions', async () => {
      const { versions } = await discoverVersions(coreRepoPath, 2);
      expect(versions).toContain("latest");
    });

    it("should return major.minor format for retired versions", async () => {
      const { retired } = await discoverVersions(coreRepoPath, 2);
      retired.forEach(version => {
        expect(version).toMatch(/^\d+\.\d+$/);
      });
    });

    it("should return full semver for active versions", async () => {
      const { versions } = await discoverVersions(coreRepoPath, 2);
      const semverVersions = versions.filter(v => v !== "latest");
      semverVersions.forEach(version => {
        expect(version).toMatch(/^v?\d+\.\d+\.\d+/);
      });
    });

    it("should deduplicate major.minor versions", async () => {
      const { versions } = await discoverVersions(coreRepoPath, 2);
      const semverVersions = versions.filter(v => v !== "latest");
      const majMinVersions = semverVersions.map(v => majmin(v));
      const uniqueMajMin = [...new Set(majMinVersions)];
      expect(majMinVersions.length).toBe(uniqueMajMin.length);
    });
  });

  describe("getStarlightVersions - Starlight format generation", () => {
    it("should format versions with major.minor slugs", async () => {
      const starlightVersions = await getStarlightVersions(coreRepoPath, 2);
      starlightVersions.forEach(v => {
        expect(v).toHaveProperty("slug");
        expect(v).toHaveProperty("label");
        expect(v.slug).toMatch(/^v\d+\.\d+$/);
      });
    });

    it('should exclude "latest" from starlight versions', async () => {
      const starlightVersions = await getStarlightVersions(coreRepoPath, 2);
      const hasLatest = starlightVersions.some(v => v.slug === "latest" || v.label === "latest");
      expect(hasLatest).toBe(false);
    });

    it("should use full version for label", async () => {
      const starlightVersions = await getStarlightVersions(coreRepoPath, 2);
      starlightVersions.forEach(v => {
        expect(v.label).toMatch(/^v?\d+\.\d+\.\d+/);
      });
    });

    it("should filter out prerelease versions", async () => {
      const starlightVersions = await getStarlightVersions(coreRepoPath, 2);
      starlightVersions.forEach(v => {
        expect(semver.prerelease(v.label)).toBeNull();
      });
    });

    it("should maintain consistency between slug and label major.minor", async () => {
      const starlightVersions = await getStarlightVersions(coreRepoPath, 2);
      starlightVersions.forEach(v => {
        const slugMajMin = v.slug.match(/(\d+\.\d+)/)?.[1];
        const labelMajMin = v.label.match(/(\d+\.\d+)/)?.[1];
        expect(slugMajMin).toBe(labelMajMin);
      });
    });
  });
});
