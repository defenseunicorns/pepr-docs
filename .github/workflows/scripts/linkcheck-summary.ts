#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const [outputFile, reportDir, exitCodeStr] = process.argv.slice(2);
const exitCode = parseInt(exitCodeStr, 10);

let output = "## Link Validation Summary\n\n";

// Extract formatted totals

try {
  const lines = readFileSync("linkcheck-output.txt", "utf-8").split("\n");
  let inSummary = false;

  for (const line of lines) {
    if (line.includes("Link Validation Summary")) {
      inSummary = true;
      continue;
    }
    if (inSummary && line.trim() === "") break;
    if (inSummary && /(Valid:|Skipped:|Warnings:|Broken:|Pages:)/.test(line)) {
      output += `- ${line}\n`;
    }
  }
} catch {
  output += "No linkcheck console output found; unable to extract formatted totals.\n";
}

output += "\n";

// Find most recent report JSON

let reportFile: string | null = null;
try {
  const candidates = readdirSync(reportDir)
    .filter(f => f.startsWith("broken-links-report-") && f.endsWith(".json"))
    .map(file => ({
      path: join(reportDir, file),
      mtime: statSync(join(reportDir, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);

  reportFile = candidates[0]?.path ?? null;
} catch {
  reportFile = null;
}

// Parse report and build table

if (reportFile) {
  try {
    const json = JSON.parse(readFileSync(reportFile, "utf-8"));
    const broken = json.brokenLinks ?? [];
    const warnings = json.warnings ?? [];
    const total = broken.length + warnings.length;

    if (total > 0) {
      output += "| Type | Status | Link | Page |\n";
      output += "|------|--------|------|------|\n";

      for (const l of broken) {
        output += `| BROKEN | ${l.status} | [${l.url}](${l.url}) | [${l.parent}](${l.parent}) |\n`;
      }
      for (const w of warnings) {
        output += `| WARNING | ${w.status} | [${w.url}](${w.url}) | [${w.parent}](${w.parent}) |\n`;
      }
      output += "\n";
    }
  } catch (err) {
    output += `Error reading report file: ${err}\n\n`;
  }
} else {
  output += `No broken-links JSON report found in ${reportDir}\n\n`;
}

// Final status message

if (exitCode !== 0) {
  output += "**Link validation failed**\n\n";
  output += "Please check the broken links report artifact for details.\n";
} else {
  output += "**All links validated successfully**\n";
}

// Write out
writeFileSync(outputFile, output, { flag: "a" });

if (exitCode !== 0) process.exit(1);
