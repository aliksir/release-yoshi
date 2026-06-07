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

import { detectVersionChange } from "../src/detector.mjs";
import { extractChangelog } from "../src/changelog.mjs";
import { createRelease } from "../src/releaser.mjs";
import { appendLog } from "../src/log.mjs";

function parseArgs(argv) {
  const args = { dir: null, dryRun: false, noPush: false };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dir" && i + 1 < argv.length) {
      args.dir = argv[++i];
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--no-push") {
      args.noPush = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`release-yoshi - Automatic git tag + GitHub release creation

Usage:
  release-yoshi [options]

Options:
  --dir <path>   Target repository directory (default: current directory)
  --dry-run      Show what would be done without executing
  --no-push      Create tag locally but don't push to origin
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
  } else {
    console.log(
      "No CHANGELOG.md entry found, will use --generate-notes"
    );
  }

  // Step 3: Create release
  const packageName = detection.packageName || "release";
  const result = createRelease(
    dir,
    detection.newVersion,
    packageName,
    notes,
    args.dryRun,
    { noPush: args.noPush }
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
