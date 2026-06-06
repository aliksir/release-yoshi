/**
 * release.test.mjs — Unit tests for detector and changelog pure functions.
 * Uses node:test (zero dependencies).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareSemver, parseVersionFromDiff } from "../src/detector.mjs";
import { extractChangelogSection } from "../src/changelog.mjs";

// ============================================================
// compareSemver
// ============================================================
describe("compareSemver", () => {
  it("returns 0 for equal versions", () => {
    assert.equal(compareSemver("1.2.3", "1.2.3"), 0);
  });

  it("returns positive when a > b (major)", () => {
    assert.ok(compareSemver("2.0.0", "1.9.9") > 0);
  });

  it("returns positive when a > b (minor)", () => {
    assert.ok(compareSemver("1.3.0", "1.2.9") > 0);
  });

  it("returns positive when a > b (patch)", () => {
    assert.ok(compareSemver("1.2.4", "1.2.3") > 0);
  });

  it("returns negative when a < b", () => {
    assert.ok(compareSemver("1.0.0", "1.0.1") < 0);
  });

  it("handles versions with missing parts", () => {
    assert.equal(compareSemver("1.0.0", "1.0.0"), 0);
  });

  it("handles major version bump", () => {
    assert.ok(compareSemver("3.0.0", "2.99.99") > 0);
  });
});

// ============================================================
// parseVersionFromDiff
// ============================================================
describe("parseVersionFromDiff", () => {
  it("extracts old and new version from a diff", () => {
    const diff = `diff --git a/package.json b/package.json
index abc1234..def5678 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "my-package",
-  "version": "1.0.0",
+  "version": "1.1.0",
   "description": "test"
 }`;

    const result = parseVersionFromDiff(diff);
    assert.equal(result.oldVersion, "1.0.0");
    assert.equal(result.newVersion, "1.1.0");
  });

  it("returns nulls when no version change in diff", () => {
    const diff = `diff --git a/package.json b/package.json
index abc1234..def5678 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "my-package",
   "version": "1.0.0",
-  "description": "old desc",
+  "description": "new desc"
 }`;

    const result = parseVersionFromDiff(diff);
    assert.equal(result.oldVersion, null);
    assert.equal(result.newVersion, null);
  });

  it("handles version without trailing comma", () => {
    const diff = `-  "version": "0.9.0"
+  "version": "1.0.0"`;

    const result = parseVersionFromDiff(diff);
    assert.equal(result.oldVersion, "0.9.0");
    assert.equal(result.newVersion, "1.0.0");
  });

  it("returns null for empty diff", () => {
    const result = parseVersionFromDiff("");
    assert.equal(result.oldVersion, null);
    assert.equal(result.newVersion, null);
  });
});

// ============================================================
// extractChangelogSection
// ============================================================
describe("extractChangelogSection", () => {
  const changelog = `# Changelog

## [1.2.0] - 2026-06-01

### Added
- Feature X
- Feature Y

### Fixed
- Bug Z

## [1.1.0] - 2026-05-01

### Added
- Feature A

## [1.0.0] - 2026-04-01

- Initial release
`;

  it("extracts the correct section for a version", () => {
    const result = extractChangelogSection(changelog, "1.2.0");
    assert.ok(result.includes("Feature X"));
    assert.ok(result.includes("Feature Y"));
    assert.ok(result.includes("Bug Z"));
    assert.ok(!result.includes("Feature A"));
    assert.ok(!result.includes("Initial release"));
  });

  it("extracts the last section (no trailing heading)", () => {
    const result = extractChangelogSection(changelog, "1.0.0");
    assert.ok(result.includes("Initial release"));
    assert.ok(!result.includes("Feature A"));
  });

  it("extracts a middle section", () => {
    const result = extractChangelogSection(changelog, "1.1.0");
    assert.ok(result.includes("Feature A"));
    assert.ok(!result.includes("Feature X"));
    assert.ok(!result.includes("Initial release"));
  });

  it("returns null for a version not in changelog", () => {
    const result = extractChangelogSection(changelog, "2.0.0");
    assert.equal(result, null);
  });

  it("returns null for empty content", () => {
    const result = extractChangelogSection("", "1.0.0");
    assert.equal(result, null);
  });

  it("handles v-prefixed version in heading", () => {
    const vChangelog = `# Changelog

## [v1.0.0] - 2026-04-01

- Initial release
`;
    const result = extractChangelogSection(vChangelog, "1.0.0");
    assert.ok(result.includes("Initial release"));
  });

  it("returns null when heading exists but body is empty", () => {
    const emptyBody = `# Changelog

## [1.0.0] - 2026-04-01

## [0.9.0] - 2026-03-01

- Something
`;
    const result = extractChangelogSection(emptyBody, "1.0.0");
    assert.equal(result, null);
  });
});
