/**
 * releaser.mjs — Create git tags and GitHub releases via gh CLI.
 * Zero dependencies (node:child_process only).
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Check if a git tag already exists.
 * @param {string} tag - Tag name (e.g., "v1.2.0")
 * @param {string} cwd - Repository directory
 * @returns {boolean}
 */
function tagExists(tag, cwd) {
  try {
    execFileSync("git", ["rev-parse", tag], {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a git tag and push it to origin.
 * @param {string} tag - Tag name
 * @param {string} cwd - Repository directory
 * @param {{ noPush?: boolean }} options
 */
function createTag(tag, cwd, { noPush = false } = {}) {
  execFileSync("git", ["tag", tag], { cwd, stdio: "pipe" });
  if (!noPush) {
    execFileSync("git", ["push", "origin", tag], { cwd, stdio: "pipe" });
  }
}

/**
 * Create a GitHub release using gh CLI.
 * @param {string} tag - Tag name
 * @param {string} title - Release title
 * @param {string|null} notes - Release notes body. If null, uses --generate-notes.
 * @param {string} cwd - Repository directory
 * @param {{ noPush?: boolean }} options
 */
function createGhRelease(tag, title, notes, cwd, { noPush = false } = {}) {
  const args = ["release", "create", tag, "--title", title];

  if (notes) {
    args.push("--notes", notes);
  } else {
    args.push("--generate-notes");
  }

  execFileSync("gh", args, { cwd, stdio: "pipe" });
}

/**
 * Create a release (tag + GitHub release).
 * @param {string} dir - Repository directory
 * @param {string} version - Version string (e.g., "1.2.0")
 * @param {string} name - Package name for the release title
 * @param {string|null} notes - Release notes, or null for auto-generation
 * @param {boolean} [dryRun=false] - If true, only report what would be done
 * @param {{ noPush?: boolean }} [options={}]
 * @returns {{ tagged: boolean, released: boolean, skipped: boolean, reason?: string }}
 */
export function createRelease(dir, version, name, notes, dryRun = false, options = {}) {
  const cwd = dir ? resolve(dir) : process.cwd();
  const tag = `v${version}`;
  const title = `${name} v${version}`;

  // Check if tag already exists
  if (tagExists(tag, cwd)) {
    return { tagged: false, released: false, skipped: true, reason: `Tag ${tag} already exists` };
  }

  if (dryRun) {
    const notesSummary = notes
      ? `CHANGELOG notes (${notes.length} chars)`
      : "--generate-notes";
    console.log(`[dry-run] Would create tag: ${tag}`);
    console.log(`[dry-run] Would create release: ${title}`);
    console.log(`[dry-run] Notes source: ${notesSummary}`);
    if (options.noPush) {
      console.log(`[dry-run] --no-push: tag would NOT be pushed to origin`);
    }
    return { tagged: false, released: false, skipped: false, reason: "dry-run" };
  }

  // Create tag
  createTag(tag, cwd, { noPush: options.noPush });

  // Create GitHub release
  createGhRelease(tag, title, notes, cwd, { noPush: options.noPush });

  return { tagged: true, released: true, skipped: false };
}
