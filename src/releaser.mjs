/**
 * releaser.mjs — Create git tags and GitHub releases via gh CLI.
 * Zero dependencies (node:child_process only).
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Check if a git tag already exists.
 * @param {string} tag
 * @param {string} cwd
 * @param {Function} exec
 * @returns {boolean}
 */
function tagExists(tag, cwd, exec) {
  try {
    exec("git", ["rev-parse", tag], {
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
 * @param {string} tag
 * @param {string} cwd
 * @param {{ noPush?: boolean, sign?: boolean }} options
 * @param {Function} exec
 */
function createTag(tag, cwd, { noPush = false, sign = false } = {}, exec) {
  const tagArgs = sign ? ["tag", "-s", tag, "-m", tag] : ["tag", tag];
  exec("git", tagArgs, { cwd, stdio: "pipe" });
  if (!noPush) {
    exec("git", ["push", "origin", tag], { cwd, stdio: "pipe" });
  }
}

/**
 * Create a GitHub release using gh CLI.
 * @param {string} tag
 * @param {string} title
 * @param {string|null} notes
 * @param {string} cwd
 * @param {{ noPush?: boolean }} options
 * @param {Function} exec
 */
function createGhRelease(tag, title, notes, cwd, { noPush = false } = {}, exec) {
  const args = ["release", "create", tag, "--title", title];

  if (notes) {
    args.push("--notes", notes);
  } else {
    args.push("--generate-notes");
  }

  exec("gh", args, { cwd, stdio: "pipe" });
}

/**
 * Create a release (tag + GitHub release).
 * @param {string} dir - Repository directory
 * @param {string} version - Version string (e.g., "1.2.0")
 * @param {string} name - Package name for the release title
 * @param {string|null} notes - Release notes, or null for auto-generation
 * @param {boolean} [dryRun=false] - If true, only report what would be done
 * @param {{ noPush?: boolean, sign?: boolean }} [options={}]
 * @param {Function|null} [execFn=null] - Injectable exec for testing; defaults to execFileSync
 * @returns {{ tagged: boolean, released: boolean, skipped: boolean, reason?: string }}
 */
export function createRelease(dir, version, name, notes, dryRun = false, options = {}, execFn = null) {
  const exec = execFn ?? execFileSync;
  const cwd = dir ? resolve(dir) : process.cwd();
  const tag = `v${version}`;
  const title = `${name} v${version}`;

  // Check if tag already exists
  if (tagExists(tag, cwd, exec)) {
    return { tagged: false, released: false, skipped: true, reason: `Tag ${tag} already exists` };
  }

  if (dryRun) {
    const notesSummary = notes
      ? `CHANGELOG notes (${notes.length} chars)`
      : "--generate-notes";
    console.log(`[dry-run] Would create tag: ${tag}${options.sign ? ' (signed)' : ''}`);
    console.log(`[dry-run] Would create release: ${title}`);
    console.log(`[dry-run] Notes source: ${notesSummary}`);
    if (options.noPush) {
      console.log(`[dry-run] --no-push: tag would NOT be pushed to origin`);
    }
    return { tagged: false, released: false, skipped: false, reason: "dry-run" };
  }

  // Create tag
  createTag(tag, cwd, { noPush: options.noPush, sign: options.sign }, exec);

  // Create GitHub release (skip when tag is not pushed — remote has no ref to point at)
  if (options.noPush) {
    return { tagged: true, released: false, skipped: false, reason: "no-push: skipped gh release" };
  }
  createGhRelease(tag, title, notes, cwd, {}, exec);

  return { tagged: true, released: true, skipped: false };
}
