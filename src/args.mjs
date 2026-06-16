/**
 * args.mjs — CLI argument parser for release-yoshi.
 */

/**
 * Parse process.argv-style array into an options object.
 * @param {string[]} argv - Full argv array (index 0=node, 1=script, 2+=flags)
 * @returns {{ dir: string|null, dryRun: boolean, noPush: boolean, strict: boolean, sign: boolean, checkCi: boolean }}
 */
export function parseArgs(argv) {
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
