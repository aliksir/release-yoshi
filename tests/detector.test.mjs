/**
 * detector.test.mjs — Unit tests for detectVersionChange (mocked git calls).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectVersionChange } from "../src/detector.mjs";

// Build a diff string that looks like what git diff outputs for a version bump
function makeDiff(oldVer, newVer) {
  return `diff --git a/package.json b/package.json
index abc..def 100644
--- a/package.json
+++ b/package.json
@@ -1,5 +1,5 @@
 {
   "name": "test-pkg",
-  "version": "${oldVer}",
+  "version": "${newVer}",
   "type": "module"
 }
`;
}

describe("detectVersionChange", () => {
  it("detects a version upgrade (1.0.0 -> 1.1.0)", () => {
    const diff = makeDiff("1.0.0", "1.1.0");
    // execFn is called for the git diff; return our synthetic diff
    const execFn = (_cmd, _args, _opts) => diff;

    const result = detectVersionChange(process.cwd(), execFn);
    assert.equal(result.changed, true);
    assert.equal(result.oldVersion, "1.0.0");
    assert.equal(result.newVersion, "1.1.0");
  });

  it("skips (changed=false) when version is downgraded", () => {
    const diff = makeDiff("1.1.0", "1.0.0");
    const execFn = (_cmd, _args, _opts) => diff;

    const result = detectVersionChange(process.cwd(), execFn);
    assert.equal(result.changed, false);
    assert.equal(result.oldVersion, "1.1.0");
    assert.equal(result.newVersion, "1.0.0");
  });

  it("returns changed=false when version is identical", () => {
    const diff = makeDiff("1.0.0", "1.0.0");
    const execFn = (_cmd, _args, _opts) => diff;

    const result = detectVersionChange(process.cwd(), execFn);
    assert.equal(result.changed, false);
  });

  it("returns changed=false when git diff fails", () => {
    const execFn = (_cmd, _args, _opts) => {
      const err = new Error("git error");
      err.status = 128;
      throw err;
    };

    const result = detectVersionChange(process.cwd(), execFn);
    assert.equal(result.changed, false);
    assert.equal(result.oldVersion, null);
    assert.equal(result.newVersion, null);
  });
});
