/**
 * releaser.mjs — gh CLI 経由で git タグと GitHub リリースを作成する
 * 外部依存ゼロ（node:child_process のみ使用）
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * 指定の git タグが既に存在するか確認する
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
 * git タグを作成して origin にプッシュする
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
 * gh CLI を使って GitHub リリースを作成する
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
 * タグ作成と GitHub リリースを一括で実行する
 * @param {string} dir - リポジトリのディレクトリ
 * @param {string} version - バージョン文字列（例: "1.2.0"）
 * @param {string} name - リリースタイトルに使うパッケージ名
 * @param {string|null} notes - リリースノート（null の場合は自動生成）
 * @param {boolean} [dryRun=false] - true の場合は実行せず内容を表示するのみ
 * @param {{ noPush?: boolean, sign?: boolean }} [options={}]
 * @param {Function|null} [execFn=null] - テスト用の注入可能な exec 関数（デフォルト: execFileSync）
 * @returns {{ tagged: boolean, released: boolean, skipped: boolean, reason?: string }}
 */
export function createRelease(dir, version, name, notes, dryRun = false, options = {}, execFn = null) {
  const exec = execFn ?? execFileSync;
  const cwd = dir ? resolve(dir) : process.cwd();
  const tag = `v${version}`;
  const title = `${name} v${version}`;

  // タグが既に存在する場合はスキップする
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

  // git タグを作成する
  createTag(tag, cwd, { noPush: options.noPush, sign: options.sign }, exec);

  // GitHub リリースを作成する（--no-push 時はスキップ — リモートに参照先がない）
  if (options.noPush) {
    return { tagged: true, released: false, skipped: false, reason: "no-push: skipped gh release" };
  }
  createGhRelease(tag, title, notes, cwd, {}, exec);

  return { tagged: true, released: true, skipped: false };
}
