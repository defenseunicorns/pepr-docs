import { describe, expect, it, beforeAll } from "vitest";
import { discoverVersions, getStarlightVersions } from "../version-discovery.mjs";
import * as semver from "semver";

describe("Version Discovery", () => {
  let coreRepoPath;

  beforeAll(() => {
    coreRepoPath = process.env.CORE || process.env.PEPR_CORE_PATH;
  });

  describe("discoverVersions", () => {
    it("should return versions and retired arrays", async () => {
      if (!coreRepoPath) {
        console.log("Skipping test: No CORE repository path provided");
        return;
      }

      const result = await discoverVersions(coreRepoPath, 2);
      expect(result).toHaveProperty("versions");
      expect(result).toHaveProperty("retired");
      expect(Array.isArray(result.versions)).toBe(true);
      expect(Array.isArray(result.retired)).toBe(true);
    });

    it('should include "latest" in versions', async () => {
      if (!coreRepoPath) {
        console.log("Skipping test: No CORE repository path provided");
        return;
      }

      const { versions } = await discoverVersions(coreRepoPath, 2);
      expect(versions).toContain("latest");
    });

    it("should respect cutoff parameter", async () => {
      if (!coreRepoPath) {
        console.log("Skipping test: No CORE repository path provided");
        return;
      }

      const cutoff = 2;
      const { versions } = await discoverVersions(coreRepoPath, cutoff);
      const versionCount = versions.filter(v => v !== "latest").length;
      expect(versionCount).toBe(cutoff);
    });

    it("should return major.minor format for retired versions", async () => {
      if (!coreRepoPath) {
        console.log("Skipping test: No CORE repository path provided");
        return;
      }

      const { retired } = await discoverVersions(coreRepoPath, 2);
      retired.forEach(version => {
        expect(version).toMatch(/^\d+\.\d+$/);
      });
    });

    it("should return full semver for active versions", async () => {
      if (!coreRepoPath) {
        console.log("Skipping test: No CORE repository path provided");
        return;
      }

      const { versions } = await discoverVersions(coreRepoPath, 2);
      const semverVersions = versions.filter(v => v !== "latest");
      semverVersions.forEach(version => {
        expect(version).toMatch(/^v?\d+\.\d+\.\d+/);
      });
    });
  });

  describe("getStarlightVersions", () => {
    it("should format versions with major.minor slugs", async () => {
      if (!coreRepoPath) {
        console.log("Skipping test: No CORE repository path provided");
        return;
      }

      const starlightVersions = await getStarlightVersions(coreRepoPath, 2);
      starlightVersions.forEach(v => {
        expect(v).toHaveProperty("slug");
        expect(v).toHaveProperty("label");
        expect(v.slug).toMatch(/^v\d+\.\d+$/);
      });
    });

    it('should not include "latest" in starlight versions', async () => {
      if (!coreRepoPath) {
        console.log("Skipping test: No CORE repository path provided");
        return;
      }

      const starlightVersions = await getStarlightVersions(coreRepoPath, 2);
      const hasLatest = starlightVersions.some(v => v.slug === "latest" || v.label === "latest");
      expect(hasLatest).toBe(false);
    });

    it("should use full version for label", async () => {
      if (!coreRepoPath) {
        console.log("Skipping test: No CORE repository path provided");
        return;
      }

      const starlightVersions = await getStarlightVersions(coreRepoPath, 2);
      starlightVersions.forEach(v => {
        expect(v.label).toMatch(/^v?\d+\.\d+\.\d+/);
      });
    });

    it("should filter out prerelease versions", async () => {
      if (!coreRepoPath) {
        console.log("Skipping test: No CORE repository path provided");
        return;
      }

      const starlightVersions = await getStarlightVersions(coreRepoPath, 2);
      starlightVersions.forEach(v => {
        expect(semver.prerelease(v.label)).toBeNull();
      });
    });

    it("should return array of version objects", async () => {
      if (!coreRepoPath) {
        console.log("Skipping test: No CORE repository path provided");
        return;
      }

      const starlightVersions = await getStarlightVersions(coreRepoPath, 2);
      expect(Array.isArray(starlightVersions)).toBe(true);
      expect(starlightVersions.length).toBeGreaterThan(0);
    });

    it("should maintain consistency between slug and label major.minor", async () => {
      if (!coreRepoPath) {
        console.log("Skipping test: No CORE repository path provided");
        return;
      }

      const starlightVersions = await getStarlightVersions(coreRepoPath, 2);
      starlightVersions.forEach(v => {
        const slugMajMin = v.slug.match(/(\d+\.\d+)/)?.[1];
        const labelMajMin = v.label.match(/(\d+\.\d+)/)?.[1];
        expect(slugMajMin).toBe(labelMajMin);
      });
    });
  });
});
