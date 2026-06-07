> 日本語版は [README.ja.md](README.ja.md) を参照してください。

# release-yoshi

Automatic git tag and GitHub Release creation tool. Detects version bumps in `package.json` via `git diff`, extracts release notes from `CHANGELOG.md`, and creates a GitHub Release — all with zero dependencies.

## Installation

```bash
npm install -g release-yoshi
```

Or use directly from a local clone:

```bash
git clone https://github.com/aliksir/release-yoshi.git
cd release-yoshi
npm link
```

## Usage

Run in a git repository after committing a `package.json` version bump:

```bash
release-yoshi
```

If no version change is detected, the tool exits silently with code 0.

### Options

| Option | Description |
|--------|-------------|
| `--dir <path>` | Target repository directory (default: current directory) |
| `--dry-run` | Show what would be done without executing |
| `--no-push` | Create the tag locally but do not push to origin |
| `-h, --help` | Show help message |

### Examples

```bash
# Preview what would happen
release-yoshi --dry-run

# Run against a different repository
release-yoshi --dir /path/to/repo

# Create tag locally without pushing
release-yoshi --no-push
```

## How It Works

release-yoshi runs three steps in sequence:

### 1. Detect (`src/detector.mjs`)

Compares `package.json` between `HEAD~1` and `HEAD` using `git diff`. If the `"version"` field changed **and** the new version is greater (semver comparison), a release is triggered.

### 2. Changelog (`src/changelog.mjs`)

Reads `CHANGELOG.md` (if present) and extracts the section matching the new version. Supports [Keep a Changelog](https://keepachangelog.com/) format with `## [x.y.z]` headings. If no matching section is found, `gh release create --generate-notes` is used as a fallback.

### 3. Release (`src/releaser.mjs`)

- Creates a git tag `vX.Y.Z`
- Pushes the tag to `origin`
- Creates a GitHub Release via `gh release create`
- Skips if the tag already exists

## Requirements

- **Node.js** >= 18 (uses `node:test` for testing)
- **git** — for version detection and tagging
- **[gh CLI](https://cli.github.com/)** — for GitHub Release creation

## License

MIT
