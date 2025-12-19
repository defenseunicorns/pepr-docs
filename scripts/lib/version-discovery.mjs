import * as semver from "semver";
import * as util from "node:util";
import * as child_process from "node:child_process";
import * as fs from "node:fs/promises";

const execFile = util.promisify(child_process.execFile);

export function majmin(version) {
  return `${semver.major(version)}.${semver.minor(version)}`;
}

/**
 * Discover versions from a git repository
 * @param {string} coreRepoPath - Path to the core repository
 * @param {number} cutoff - Number of major.minor versions to keep (default: 2)
 * @returns {Promise<{versions: string[], retired: string[]}>}
 */
export async function discoverVersions(coreRepoPath, cutoff = 2) {
  let { stdout } = await execFile("git", ["tag"], { cwd: coreRepoPath });
  const tags = stdout.trim().split("\n").filter(Boolean);
  const vers = tags.filter(semver.valid);
  const sort = semver.rsort(vers);

  const majmins = sort
    .map(v => majmin(v))
    .reduce((list, mm) => {
      list.includes(mm) ? null : list.push(mm);
      return list;
    }, []);

  let ongoing = majmins.slice(0, cutoff);
  let retired = majmins.slice(cutoff);

  // Only process the latest version of each major.minor to reduce build time
  const versions = ongoing
    .map(mm => {
      return sort.find(ver => majmin(ver) === mm);
    })
    .filter(Boolean);

  // Add 'latest' for current development
  versions.push("latest");

  return { versions, retired };
}

/**
 * Get the latest stable versions for Starlight configuration
 * @param {string} coreRepoPath - Path to the core repository
 * @param {number} cutoff - Number of versions to include (default: 2)
 * @returns {Promise<Array<{slug: string, label: string}>>}
 */
export async function getStarlightVersions(coreRepoPath, cutoff = 2) {
  const { versions } = await discoverVersions(coreRepoPath, cutoff);

  const stableVersions = versions.filter(v => v !== "latest" && semver.prerelease(v) === null);

  return stableVersions.map(version => {
    const versionMajMin = version.replace(/^v(\d+\.\d+)\.\d+$/, "v$1");
    return {
      slug: versionMajMin,
      label: version,
    };
  });
}

/**
 * Find the current version (latest stable)
 * @param {string[]} versions - Array of version strings
 * @returns {string|null} - The most recent stable version, or null if none found
 */
export function findCurrentVersion(versions) {
  const stableVersions = versions.filter(
    v => v !== "latest" && v !== "main" && semver.valid(v) && semver.prerelease(v) === null,
  );

  if (stableVersions.length === 0) {
    return null;
  }

  return semver.rsort(stableVersions)[0];
}

/**
 * Check if a directory exists
 * @param {string} path - Directory path to check
 * @returns {Promise<boolean>}
 */
export async function dirExists(path) {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
