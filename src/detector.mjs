/**
 * detector.mjs — git diff 経由で package.json のバージョン変更を検出する
 * 外部依存ゼロ（node:child_process, node:fs, node:path のみ使用）
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 2つのsemver文字列（major.minor.patch）を比較する
 * @param {string} a
 * @param {string} b
 * @returns {number} a < b なら負、等しければ 0、a > b なら正
 */
export function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

/**
 * package.json の unified diff から変更前後のバージョンを抽出する
 * 以下のような行を検索する:
 *   -  "version": "1.0.0",
 *   +  "version": "1.1.0",
 * @param {string} diffText
 * @returns {{ oldVersion: string|null, newVersion: string|null }}
 */
export function parseVersionFromDiff(diffText) {
  let oldVersion = null;
  let newVersion = null;

  const versionRe = /^\s*"version"\s*:\s*"([^"]+)"/;

  for (const line of diffText.split("\n")) {
    if (line.startsWith("-") && !line.startsWith("---")) {
      const m = line.slice(1).match(versionRe);
      if (m) oldVersion = m[1];
    }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      const m = line.slice(1).match(versionRe);
      if (m) newVersion = m[1];
    }
  }

  return { oldVersion, newVersion };
}

/**
 * 直近コミットで package.json のバージョンが変更されたか検出する
 * @param {string} [dir=process.cwd()] - リポジトリのディレクトリ
 * @param {Function|null} [execFn=null] - テスト用の注入可能な exec 関数（デフォルト: execFileSync）
 * @returns {{ changed: boolean, oldVersion: string|null, newVersion: string|null, packageName: string|null }}
 */
export function detectVersionChange(dir, execFn = null) {
  const exec = execFn ?? execFileSync;
  const cwd = dir ? resolve(dir) : process.cwd();

  // パッケージ名を取得するために現在の package.json を読み込む
  let packageName = null;
  try {
    const pkg = JSON.parse(readFileSync(resolve(cwd, "package.json"), "utf8"));
    packageName = pkg.name || null;
  } catch {
    // package.json not readable — will still try diff
  }

  // HEAD~1 と HEAD の間の package.json の差分を取得する
  let diffText;
  try {
    diffText = exec(
      "git",
      ["diff", "HEAD~1", "HEAD", "--", "package.json"],
      { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
  } catch {
    // No previous commit or git error
    return { changed: false, oldVersion: null, newVersion: null, packageName };
  }

  if (!diffText.trim()) {
    return { changed: false, oldVersion: null, newVersion: null, packageName };
  }

  const { oldVersion, newVersion } = parseVersionFromDiff(diffText);

  if (!oldVersion || !newVersion || oldVersion === newVersion) {
    return { changed: false, oldVersion, newVersion, packageName };
  }

  // 新バージョンが旧バージョンより大きい場合のみ有効な変更とみなす
  const isUpgrade = compareSemver(newVersion, oldVersion) > 0;

  return {
    changed: isUpgrade,
    oldVersion,
    newVersion,
    packageName,
  };
}
