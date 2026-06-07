#!/usr/bin/env node

/**
 * release-yoshi CLI — Automatic git tag + GitHub release creation.
 *
 * Usage:
 *   release-yoshi [--dir <path>] [--dry-run] [--no-push]
 *
 * Options:
 *   --dir <path>   Target repository directory (default: cwd)
 *   --dry-run      Show what would be done without executing
 *   --no-push      Create tag locally but don't push to origin
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { detectVersionChange } from "../src/detector.mjs";
import { extractChangelog } from "../src/changelog.mjs";
import { createRelease } from "../src/releaser.mjs";
import { appendLog } from "../src/log.mjs";

function checkCiStatus(dir) {
  const cwd = dir ? resolve(dir) : process.cwd();
  try {
    const branch = execFileSync("git", ["branch", "--show-current"], { cwd, encoding: "utf8" }).trim();
    const result = execFileSync("gh", ["pr", "checks", branch, "--json", "state"], {
      cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (!result) return true;
    const checks = JSON.parse(result);
    return checks.every((c) => c.state === "SUCCESS" || c.state === "SKIPPED");
  } catch {
    try {
      const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).trim();
      const result = execFileSync("gh", ["api", `repos/{owner}/{repo}/commits/${sha}/status`, "--jq", ".state"], {
        cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      return result === "success" || result === "pending";
    } catch {
      console.warn("WARNING: CI status check failed (gh CLI error). Proceeding anyway.");
      return true;
    }
  }
}

function parseArgs(argv) {
  const args = { dir: null, dryRun: false, noPush: false, strict: false, sign: false, checkCi: false };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dir" && i + 1 < argv.length) {
      args.dir = argv[++i];
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--no-push") {
      args.noPush = true;
    } else if (arg === "--strict") {
      args.strict = true;
    } else if (arg === "--sign") {
      args.sign = true;
    } else if (arg === "--check-ci") {
      args.checkCi = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`release-yoshi v0.2.0 - Automatic git tag + GitHub release creation

Usage:
  release-yoshi [options]

Options:
  --dir <path>   Target repository directory (default: current directory)
  --dry-run      Show what would be done without executing
  --no-push      Create tag locally but don't push to origin
  --strict       CHANGELOG section required (no --generate-notes fallback)
  --sign         Create signed tag (git tag -s, requires GPG/SSH key)
  --check-ci     Check branch protection / CI status before push
  -h, --help     Show this help message`);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  return args;
}

const _start = Date.now();
process.on('exit', (code) => {
  appendLog({
    tool: 'release-yoshi',
    command: 'release',
    ts: new Date().toISOString(),
    duration_ms: Date.now() - _start,
    exit_code: code,
    meta: {},
  });
});

function main() {
  const args = parseArgs(process.argv);
  const dir = args.dir || process.cwd();

  // Step 1: Detect version change
  const detection = detectVersionChange(dir);

  if (!detection.changed) {
    if (detection.oldVersion && detection.newVersion) {
      console.log(
        `No version upgrade detected (${detection.oldVersion} -> ${detection.newVersion})`
      );
    } else {
      console.log("No version change detected in package.json");
    }
    process.exit(0);
  }

  console.log(
    `Version change detected: ${detection.oldVersion} -> ${detection.newVersion}`
  );

  // Step 2: Extract changelog
  const notes = extractChangelog(dir, detection.newVersion);
  if (notes) {
    console.log(`CHANGELOG.md section found for v${detection.newVersion}`);
  } else if (args.strict) {
    console.error(`ERROR: --strict mode: CHANGELOG.md に v${detection.newVersion} のセクションがありません`);
    console.error("  CHANGELOG.md に該当バージョンのエントリを追加してからリリースしてください");
    process.exit(1);
  } else {
    console.log(
      "No CHANGELOG.md entry found, will use --generate-notes"
    );
  }

  // Step 2.5: Check CI status (--check-ci)
  if (args.checkCi && !args.noPush) {
    const ciOk = checkCiStatus(dir);
    if (!ciOk) {
      console.error("ERROR: CI checks have not passed. Release aborted.");
      console.error("  Use --dry-run to preview without CI check, or fix CI first.");
      process.exit(1);
    }
    console.log("CI status: all checks passed");
  }

  // Step 3: Create release
  const packageName = detection.packageName || "release";
  const result = createRelease(
    dir,
    detection.newVersion,
    packageName,
    notes,
    args.dryRun,
    { noPush: args.noPush, sign: args.sign }
  );

  if (result.skipped) {
    console.log(`Skipped: ${result.reason}`);
    process.exit(0);
  }

  if (args.dryRun) {
    console.log("Dry run complete.");
    process.exit(0);
  }

  console.log(
    `Released ${packageName} v${detection.newVersion} successfully!`
  );
}

main();
