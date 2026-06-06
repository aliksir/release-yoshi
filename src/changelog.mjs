/**
 * changelog.mjs — Extract release notes from CHANGELOG.md for a specific version.
 * Zero dependencies (node:fs, node:path only).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Extract the changelog section for a given version.
 *
 * Expected format (Keep a Changelog style):
 *   ## [1.2.0] - 2026-06-01
 *   ### Added
 *   - Feature X
 *   ...
 *   ## [1.1.0] - 2026-05-01
 *
 * Extracts everything between `## [version]` and the next `## [` heading.
 *
 * @param {string} content - Full CHANGELOG.md content
 * @param {string} version - Target version (e.g., "1.2.0")
 * @returns {string|null} Extracted section body, or null if not found
 */
export function extractChangelogSection(content, version) {
  const lines = content.split("\n");
  const escapedVersion = version.replace(/\./g, "\\.");
  // Match: ## [1.2.0] or ## [1.2.0] - date or ## [v1.2.0]
  const startRe = new RegExp(
    `^##\\s+\\[v?${escapedVersion}\\]`
  );

  let capturing = false;
  const captured = [];

  for (const line of lines) {
    if (capturing) {
      // Stop at the next version heading
      if (/^##\s+\[/.test(line)) break;
      captured.push(line);
    } else if (startRe.test(line)) {
      capturing = true;
      // Don't include the heading line itself in the body
    }
  }

  if (!capturing) return null;

  // Trim leading/trailing blank lines
  const text = captured.join("\n").trim();
  return text || null;
}

/**
 * Read CHANGELOG.md from a directory and extract notes for a version.
 * @param {string} [dir=process.cwd()] - Repository directory
 * @param {string} version - Target version (e.g., "1.2.0")
 * @returns {string|null} Extracted notes, or null if CHANGELOG.md not found or version not in it
 */
export function extractChangelog(dir, version) {
  const cwd = dir ? resolve(dir) : process.cwd();

  let content;
  try {
    content = readFileSync(resolve(cwd, "CHANGELOG.md"), "utf8");
  } catch {
    return null;
  }

  return extractChangelogSection(content, version);
}
