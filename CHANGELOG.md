# Changelog

## [0.3.0] - 2026-06-16

### Added
- DI pattern (execFn) for detector and releaser — enables unit testing without real git/gh calls
- Extracted parseArgs to src/args.mjs for independent testing
- Unit tests for detectVersionChange, createRelease, parseArgs (+18 tests, total 36)
- `exports` field in package.json

### Fixed
- log.mjs error handling — write failures now logged to stderr instead of propagating

## [0.2.0] - 2026-06-08

### Added
- `--strict` option for CI enforcement
- `--sign` option for GPG-signed tags
- `--check-ci` option for CI status verification before release

## [0.1.0] - 2026-06-07

### Added
- Initial release
- Detect version changes from git diff
- Semver comparison (only process upgrades)
- CHANGELOG.md section extraction (Keep a Changelog format)
- Fallback to `gh release create --generate-notes`
- `--dry-run` and `--no-push` options
