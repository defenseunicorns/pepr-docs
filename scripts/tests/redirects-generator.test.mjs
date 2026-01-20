import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  generateNetlifyRedirects,
  generateManualRedirects,
  generatePatchToMinorRedirects,
  generateRetiredVersionRedirects,
  generateExampleRedirects,
  getStableVersions,
} from "../lib/redirects-generator.mjs";

describe("Unit Tests - Helper Functions", () => {
  describe("getStableVersions - version filtering logic", () => {
    it.each([
      [
        ["v0.54.0", "v0.54.1", "v0.55.0", "latest"],
        ["v0.54.0", "v0.54.1", "v0.55.0"],
        "should filter out 'latest'",
      ],
      [
        ["v0.54.0", "v0.54.1-beta.1", "v0.55.0"],
        ["v0.54.0", "v0.55.0"],
        "should filter out prerelease versions",
      ],
      [
        ["v0.54.0", "latest", "v0.54.1-beta.1", "v0.55.0-rc.1"],
        ["v0.54.0"],
        "should filter out both 'latest' and prereleases",
      ],
      [["v0.54.0", "v0.55.0"], ["v0.54.0", "v0.55.0"], "should keep only stable versions"],
    ])("should correctly filter versions: %s", (input, expected) => {
      const result = getStableVersions(input);

      expect(result).toEqual(expected);
    });
  });

  describe("generateManualRedirects - wildcard and splat logic", () => {
    it("should add wildcards and splats to paths without them", () => {
      const result = generateManualRedirects();

      expect(result.lines).toContain("/main/*  /:splat  301");
      expect(result.lines).toContain("/latest/*  /:splat  301");
      expect(result.lines).toContain("/support/*  /community/support/:splat  301");
      expect(result.count).toBeGreaterThan(0);
    });

    it("should preserve existing wildcards and splats", () => {
      const result = generateManualRedirects();
      const redirectLines = result.lines.filter(line => !line.startsWith("#") && line.trim());
      expect(redirectLines.length).toBeGreaterThan(0);
      redirectLines.forEach(line => {
        expect(line).toMatch(/\s+301$/);
      });
    });

    it("should include section header", () => {
      const result = generateManualRedirects();

      expect(result.lines.some(line => line.includes("Manual Redirects"))).toBe(true);
    });
  });

  describe("generatePatchToMinorRedirects - prerelease filtering and redirect generation", () => {
    it("should filter out prerelease versions", () => {
      const activeVersions = ["v0.54.0", "v0.54.1-beta.1", "v0.55.0"];
      const allTags = ["v0.54.0", "v0.54.1", "v0.55.0"];
      const result = generatePatchToMinorRedirects(activeVersions, allTags);

      expect(result.lines.some(line => line.includes("v0.54.1-beta.1"))).toBe(false);
      expect(result.lines.some(line => line.includes("/v0.54.0"))).toBe(true);
    });

    it("should generate both exact and wildcard redirects for each patch version", () => {
      const activeVersions = ["v0.54.0", "v0.54.1"];
      const allTags = ["v0.54.0", "v0.54.1"];
      const result = generatePatchToMinorRedirects(activeVersions, allTags);

      expect(result.lines).toContain("/v0.54.0  /v0.54  301");
      expect(result.lines).toContain("/v0.54.0/*  /v0.54/:splat  301");
      expect(result.lines).toContain("/v0.54.1  /v0.54  301");
      expect(result.lines).toContain("/v0.54.1/*  /v0.54/:splat  301");
    });

    it("should count rules correctly (2 per patch version)", () => {
      const activeVersions = ["v0.54.0", "v0.54.1", "v0.54.2"];
      const allTags = ["v0.54.0", "v0.54.1", "v0.54.2"];
      const result = generatePatchToMinorRedirects(activeVersions, allTags);
      expect(result.count).toBe(6);
    });

    it("should group patch versions by major.minor", () => {
      const activeVersions = ["v0.54.0", "v0.54.1", "v0.55.0"];
      const allTags = ["v0.54.0", "v0.54.1", "v0.55.0"];
      const result = generatePatchToMinorRedirects(activeVersions, allTags);

      expect(result.lines.some(line => line.includes("/v0.54  301"))).toBe(true);
      expect(result.lines.some(line => line.includes("/v0.55  301"))).toBe(true);
    });
  });

  describe("generateRetiredVersionRedirects - version matching logic", () => {
    it("should generate redirect for major.minor version", () => {
      const retiredVersions = ["0.53"];
      const allTags = ["v0.53.0", "v0.53.1"];
      const result = generateRetiredVersionRedirects(retiredVersions, allTags);

      expect(result.lines).toContain("/v0.53/*  /:splat  301");
    });

    it("should generate redirects for all patch versions", () => {
      const retiredVersions = ["0.53"];
      const allTags = ["v0.53.0", "v0.53.1", "v0.53.2"];
      const result = generateRetiredVersionRedirects(retiredVersions, allTags);

      expect(result.lines).toContain("/v0.53.0/*  /:splat  301");
      expect(result.lines).toContain("/v0.53.1/*  /:splat  301");
      expect(result.lines).toContain("/v0.53.2/*  /:splat  301");
    });

    it("should handle multiple retired versions", () => {
      const retiredVersions = ["0.53", "0.52"];
      const allTags = ["v0.52.0", "v0.53.0"];
      const result = generateRetiredVersionRedirects(retiredVersions, allTags);

      expect(result.lines).toContain("/v0.53/*  /:splat  301");
      expect(result.lines).toContain("/v0.52/*  /:splat  301");
    });

    it("should count redirects correctly", () => {
      const retiredVersions = ["0.53"];
      const allTags = ["v0.53.0", "v0.53.1"];
      const result = generateRetiredVersionRedirects(retiredVersions, allTags);

      expect(result.count).toBe(3);
    });
  });

  describe("generateExampleRedirects - versioned examples to unversioned", () => {
    it("should generate redirects from versioned examples to unversioned", () => {
      const activeVersions = ["v0.54.0", "v0.55.0", "latest"];
      const result = generateExampleRedirects(activeVersions);

      expect(result.lines).toContain("/v0.54/examples/*  /examples/:splat  301");
      expect(result.lines).toContain("/v0.55/examples/*  /examples/:splat  301");
    });

    it("should filter out prerelease versions", () => {
      const activeVersions = ["v0.54.0", "v0.55.0-beta.1", "latest"];
      const result = generateExampleRedirects(activeVersions);

      expect(result.lines.some(line => line.includes("v0.55"))).toBe(false);
      expect(result.lines.some(line => line.includes("v0.54"))).toBe(true);
    });

    it("should filter out 'latest'", () => {
      const activeVersions = ["v0.54.0", "latest"];
      const result = generateExampleRedirects(activeVersions);

      expect(result.lines.some(line => line.includes("/latest/examples"))).toBe(false);
    });

    it("should deduplicate major.minor versions", () => {
      const activeVersions = ["v0.54.0", "v0.54.1", "v0.54.2"];
      const result = generateExampleRedirects(activeVersions);

      const v054Lines = result.lines.filter(line => line.includes("/v0.54/examples"));
      expect(v054Lines.length).toBe(2);
    });

    it("should count redirects correctly", () => {
      const activeVersions = ["v0.54.0", "v0.55.0", "latest"];
      const result = generateExampleRedirects(activeVersions);

      expect(result.count).toBe(4);
    });

    it("should include section header", () => {
      const activeVersions = ["v0.54.0"];
      const result = generateExampleRedirects(activeVersions);

      expect(result.lines.some(line => line.includes("Example Redirects"))).toBe(true);
    });
  });
});

describe("Integration Tests - Full Pipeline", () => {
  let tempDir;
  let outputPath;
  let mockCoreRepo;

  beforeEach(async () => {
    // Create temporary directory for test outputs
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "redirects-test-"));
    outputPath = path.join(tempDir, "_redirects");

    // Create mock core repo with proper git initialization
    mockCoreRepo = path.join(tempDir, "mock-core");
    await fs.mkdir(mockCoreRepo, { recursive: true });

    // Initialize git repo and create tags
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);

    await exec("git", ["init"], { cwd: mockCoreRepo });
    await exec("git", ["config", "user.email", "test@example.com"], { cwd: mockCoreRepo });
    await exec("git", ["config", "user.name", "Test User"], { cwd: mockCoreRepo });

    // Create a dummy commit (required for tags)
    await fs.writeFile(path.join(mockCoreRepo, "README.md"), "# Test");
    await exec("git", ["add", "."], { cwd: mockCoreRepo });
    await exec("git", ["commit", "-m", "Initial commit"], { cwd: mockCoreRepo });

    // Create test tags
    const tags = [
      "v0.53.0",
      "v0.53.1",
      "v0.54.0",
      "v0.54.1",
      "v0.54.2",
      "v0.55.0",
      "v0.55.1-beta.1",
    ];

    await Promise.all(tags.map(tag => exec("git", ["tag", tag], { cwd: mockCoreRepo })));
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should generate complete redirects file with all sections", async () => {
    const config = {
      coreRepoPath: mockCoreRepo,
      retiredVersions: ["0.53"],
      activeVersions: ["v0.54.0", "v0.55.0"],
      outputPath,
    };

    await generateNetlifyRedirects(config);

    const content = await fs.readFile(outputPath, "utf8");
    expect(content).toContain("# Retired Version Redirects");
    expect(content).toContain("# Manual Redirects");
    expect(content).toContain("# Automatic Patch-to-Minor Redirects");
    expect(content).toContain("# Example Redirects");
    expect(content).toContain("DO NOT EDIT MANUALLY");
  });

  it("should return accurate redirect counts", async () => {
    const config = {
      coreRepoPath: mockCoreRepo,
      retiredVersions: ["0.53"],
      activeVersions: ["v0.54.0"],
      outputPath,
    };

    const results = await generateNetlifyRedirects(config);

    expect(results).toHaveProperty("totalRules");
    expect(results).toHaveProperty("retiredCount");
    expect(results).toHaveProperty("manualCount");
    expect(results).toHaveProperty("patchCount");
    expect(results).toHaveProperty("examplesCount");
    expect(results.totalRules).toBe(
      results.retiredCount + results.manualCount + results.patchCount + results.examplesCount,
    );
  });

  it("should use proper Netlify redirect format throughout", async () => {
    const config = {
      coreRepoPath: mockCoreRepo,
      retiredVersions: ["0.53"],
      activeVersions: ["v0.54.0"],
      outputPath,
    };

    await generateNetlifyRedirects(config);

    const content = await fs.readFile(outputPath, "utf8");
    const redirectLines = content
      .split("\n")
      .filter(l => !l.startsWith("#") && l.trim() && !l.includes("Auto-generated"));

    for (const line of redirectLines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length > 0) {
        expect(parts).toHaveLength(3);
        expect(parts[2]).toBe("301");
      }
    }
  });
});
