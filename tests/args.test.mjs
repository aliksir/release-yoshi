/**
 * args.test.mjs — Unit tests for parseArgs.
 * Unknown-argument cases use a child process to avoid process.exit() in test runner.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseArgs } from "../src/args.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const argsModule = join(__dirname, "../src/args.mjs");

describe("parseArgs", () => {
  it("returns all defaults when no flags are given", () => {
    const result = parseArgs(["node", "release-yoshi.mjs"]);
    assert.deepEqual(result, {
      dir: null,
      dryRun: false,
      noPush: false,
      strict: false,
      sign: false,
      checkCi: false,
    });
  });

  it("parses --dry-run", () => {
    const result = parseArgs(["node", "release-yoshi.mjs", "--dry-run"]);
    assert.equal(result.dryRun, true);
  });

  it("parses --no-push", () => {
    const result = parseArgs(["node", "release-yoshi.mjs", "--no-push"]);
    assert.equal(result.noPush, true);
  });

  it("parses --sign", () => {
    const result = parseArgs(["node", "release-yoshi.mjs", "--sign"]);
    assert.equal(result.sign, true);
  });

  it("parses --dir <path>", () => {
    const result = parseArgs(["node", "release-yoshi.mjs", "--dir", "/some/path"]);
    assert.equal(result.dir, "/some/path");
  });

  it("parses --strict and --check-ci together", () => {
    const result = parseArgs(["node", "release-yoshi.mjs", "--strict", "--check-ci"]);
    assert.equal(result.strict, true);
    assert.equal(result.checkCi, true);
  });

  it("exits with code 1 for an unknown argument", () => {
    // Run in subprocess to avoid killing the test runner
    const script = `
import { parseArgs } from ${JSON.stringify(argsModule)};
parseArgs(["node", "release-yoshi.mjs", "--unknown-flag"]);
`;
    assert.throws(
      () =>
        execFileSync(process.execPath, ["--input-type=module"], {
          input: script,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        }),
      (err) => {
        assert.equal(err.status, 1);
        return true;
      }
    );
  });
});
