/**
 * releaser.test.mjs — Unit tests for createRelease (mocked git/gh calls).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRelease } from "../src/releaser.mjs";

/**
 * Build a mock execFn that records all calls and throws on configured commands.
 * @param {{ failOn?: string[] }} opts
 */
function makeExecFn({ failOn = [] } = {}) {
  const calls = [];
  const fn = (cmd, args, _opts) => {
    calls.push({ cmd, args });
    const key = [cmd, ...args].join(" ");
    if (failOn.some((f) => key.includes(f))) {
      const err = new Error(`mock failure: ${key}`);
      err.status = 1;
      throw err;
    }
    return "";
  };
  fn.calls = calls;
  return fn;
}

describe("createRelease", () => {
  it("creates tag and gh release on happy path", () => {
    // git rev-parse throws (tag does not exist), other calls succeed
    const execFn = makeExecFn({ failOn: ["rev-parse v1.1.0"] });
    const dir = process.cwd();

    const result = createRelease(dir, "1.1.0", "my-pkg", "## Notes", false, {}, execFn);

    assert.equal(result.tagged, true);
    assert.equal(result.released, true);
    assert.equal(result.skipped, false);

    const cmds = execFn.calls.map((c) => c.args.join(" "));
    assert.ok(cmds.some((c) => c.startsWith("tag ")), "should call git tag");
    assert.ok(cmds.some((c) => c.startsWith("push origin ")), "should push tag");
    assert.ok(cmds.some((c) => c.startsWith("release create")), "should create gh release");
  });

  it("skips when tag already exists", () => {
    // rev-parse succeeds = tag exists
    const execFn = makeExecFn();
    const dir = process.cwd();

    const result = createRelease(dir, "1.0.0", "my-pkg", null, false, {}, execFn);

    assert.equal(result.skipped, true);
    assert.ok(result.reason.includes("already exists"));
    // No tag or release should have been created
    const cmds = execFn.calls.map((c) => c.args.join(" "));
    assert.ok(!cmds.some((c) => c.startsWith("tag ")));
  });

  it("dry-run returns without executing git/gh commands", () => {
    const execFn = makeExecFn({ failOn: ["rev-parse v2.0.0"] });
    const dir = process.cwd();

    const result = createRelease(dir, "2.0.0", "my-pkg", null, true, {}, execFn);

    assert.equal(result.reason, "dry-run");
    assert.equal(result.tagged, false);
    assert.equal(result.released, false);
    // Only rev-parse (tag existence check) should have been called
    const cmds = execFn.calls.map((c) => c.args.join(" "));
    assert.ok(!cmds.some((c) => c.startsWith("tag ")), "dry-run must not create tag");
    assert.ok(!cmds.some((c) => c.startsWith("release create")), "dry-run must not create release");
  });

  it("noPush: creates tag locally but skips push and gh release", () => {
    const execFn = makeExecFn({ failOn: ["rev-parse v1.2.0"] });
    const dir = process.cwd();

    const result = createRelease(dir, "1.2.0", "my-pkg", null, false, { noPush: true }, execFn);

    assert.equal(result.tagged, true);
    assert.equal(result.released, false);
    assert.ok(result.reason.includes("no-push"));
    const cmds = execFn.calls.map((c) => c.args.join(" "));
    assert.ok(!cmds.some((c) => c.startsWith("push origin ")), "must not push");
    assert.ok(!cmds.some((c) => c.startsWith("release create")), "must not create gh release");
  });

  it("propagates error when gh release create fails", () => {
    const execFn = makeExecFn({ failOn: ["rev-parse v1.3.0", "release create"] });
    const dir = process.cwd();

    assert.throws(
      () => createRelease(dir, "1.3.0", "my-pkg", null, false, {}, execFn),
      /mock failure/
    );
  });
});
