import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { LinkChecker } from "linkinator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_URL = process.env.TEST_URL || "http://localhost:4321";
const CONFIG_PATH = path.resolve(__dirname, "../../linkinator.config.json");

async function readConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.warn("No linkinator config found, using defaults");
    return {};
  }
}

describe("Link Validation", () => {
  let config;

  beforeAll(async () => {
    config = await readConfig();
  });

  it("should find no broken links on the site", async () => {
    const checker = new LinkChecker();
    const brokenLinks = [];
    const stats = {
      valid: 0,
      skipped: 0,
      checked: 0,
      pages: new Set(),
    };

    const checkerConfig = {
      path: DEFAULT_URL,
      recurse: config.recurse !== undefined ? config.recurse : true,
      concurrency: config.concurrency || 100,
      retry: config.retry !== undefined ? config.retry : true,
      linksToSkip: Array.isArray(config.skip) ? config.skip : [],
      timeout: config.timeout || 10000,
    };

    checker.on("pagestart", url => stats.pages.add(url));

    checker.on("link", result => {
      stats.checked++;

      if (result.state === "SKIPPED") {
        stats.skipped++;
      } else if (result.state === "BROKEN") {
        brokenLinks.push({
          url: result.url,
          parent: result.parent,
          status: result.status,
        });
      } else if (result.state === "OK") {
        stats.valid++;
      }
    });

    console.log(`\nValidating links at: ${DEFAULT_URL}`);
    console.log(
      `Config: recurse=${checkerConfig.recurse}, concurrency=${checkerConfig.concurrency}, timeout=${checkerConfig.timeout}ms`,
    );
    console.log(`Skip patterns: ${checkerConfig.linksToSkip.length} patterns loaded`);
    console.log(`First few patterns: ${checkerConfig.linksToSkip.slice(0, 3).join(", ")}\n`);

    const results = await checker.check(checkerConfig);

    // Log summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Link Validation Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Valid:   ${stats.valid.toLocaleString()}`);
    console.log(`Skipped: ${stats.skipped.toLocaleString()}`);
    console.log(`Broken:  ${brokenLinks.length.toLocaleString()}`);
    console.log(`Pages:   ${stats.pages.size.toLocaleString()}`);

    // Save report if there are broken links
    if (brokenLinks.length > 0) {
      const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
      const reportPath = path.resolve(process.cwd(), `broken-links-report-${timestamp}.json`);

      await fs.writeFile(
        reportPath,
        JSON.stringify(
          {
            date: new Date().toISOString(),
            url: DEFAULT_URL,
            summary: {
              total: results.links.length,
              valid: stats.valid,
              broken: brokenLinks.length,
              skipped: stats.skipped,
              pagesChecked: Array.from(stats.pages),
            },
            brokenLinks,
          },
          null,
          2,
        ),
      );

      console.log(`\nReport saved: ${reportPath}`);

      // Group by page for better error messages
      const byPage = {};
      brokenLinks.forEach(link => {
        if (!byPage[link.parent]) byPage[link.parent] = [];
        byPage[link.parent].push(link);
      });

      const errorMessage = Object.entries(byPage)
        .map(
          ([page, links]) =>
            `\nPage: ${page}\n${links.map(l => `  - ${l.url} (${l.status})`).join("\n")}`,
        )
        .join("\n");

      expect(
        brokenLinks,
        `Found ${brokenLinks.length} broken links:\n${errorMessage}`,
      ).toHaveLength(0);
    }

    // Validate we actually checked something
    expect(stats.valid, "No valid links found - is the server running?").toBeGreaterThan(0);
  }, 60000); // 60 second timeout for full site crawl
});
