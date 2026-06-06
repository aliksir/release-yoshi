/**
 * detector.mjs — Detect version changes in package.json via git diff.
 * Zero dependencies (node:child_process, node:fs, node:path only).
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Compare two semver strings (major.minor.patch).
 * @param {string} a
 * @param {string} b
 * @returns {number} negative if a < b, 0 if equal, positive if a > b
 */
export function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

/**
 * Parse old and new version from a unified diff of package.json.
 * Looks for lines like:
 *   -  "version": "1.0.0",
 *   +  "version": "1.1.0",
 * @param {string} diffText
 * @returns {{ oldVersion: string|null, newVersion: string|null }}
 */
export function parseVersionFromDiff(diffText) {
  let oldVersion = null;
  let newVersion = null;

  const versionRe = /^\s*"version"\s*:\s*"([^"]+)"/;

  for (const line of diffText.split("\n")) {
    if (line.startsWith("-") && !line.startsWith("---")) {
      const m = line.slice(1).match(versionRe);
      if (m) oldVersion = m[1];
    }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      const m = line.slice(1).match(versionRe);
      if (m) newVersion = m[1];
    }
  }

  return { oldVersion, newVersion };
}

/**
 * Detect whether the latest commit changed package.json version.
 * @param {string} [dir=process.cwd()] - Repository directory
 * @returns {{ changed: boolean, oldVersion: string|null, newVersion: string|null, packageName: string|null }}
 */
export function detectVersionChange(dir) {
  const cwd = dir ? resolve(dir) : process.cwd();

  // Read current package.json for the package name
  let packageName = null;
  try {
    const pkg = JSON.parse(readFileSync(resolve(cwd, "package.json"), "utf8"));
    packageName = pkg.name || null;
  } catch {
    // package.json not readable — will still try diff
  }

  // Get diff of package.json between HEAD~1 and HEAD
  let diffText;
  try {
    diffText = execFileSync(
      "git",
      ["diff", "HEAD~1", "HEAD", "--", "package.json"],
      { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
  } catch {
    // No previous commit or git error
    return { changed: false, oldVersion: null, newVersion: null, packageName };
  }

  if (!diffText.trim()) {
    return { changed: false, oldVersion: null, newVersion: null, packageName };
  }

  const { oldVersion, newVersion } = parseVersionFromDiff(diffText);

  if (!oldVersion || !newVersion || oldVersion === newVersion) {
    return { changed: false, oldVersion, newVersion, packageName };
  }

  // Only consider it a valid change if the new version is greater
  const isUpgrade = compareSemver(newVersion, oldVersion) > 0;

  return {
    changed: isUpgrade,
    oldVersion,
    newVersion,
    packageName,
  };
}
