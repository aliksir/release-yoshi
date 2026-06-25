/**
 * changelog.mjs — 指定バージョンのリリースノートを CHANGELOG.md から抽出する
 * 外部依存ゼロ（node:fs, node:path のみ使用）
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 指定バージョンの CHANGELOG セクションを抽出する
 *
 * 期待するフォーマット（Keep a Changelog スタイル）:
 *   ## [1.2.0] - 2026-06-01
 *   ### Added
 *   - Feature X
 *   ...
 *   ## [1.1.0] - 2026-05-01
 *
 * `## [version]` から次の `## [` 見出しまでの内容を抽出する
 *
 * @param {string} content - CHANGELOG.md の全文
 * @param {string} version - 対象バージョン（例: "1.2.0"）
 * @returns {string|null} 抽出されたセクション本文、見つからない場合は null
 */
export function extractChangelogSection(content, version) {
  const lines = content.split("\n");
  const escapedVersion = version.replace(/\./g, "\\.");
  // ## [1.2.0]、## [1.2.0] - date、## [v1.2.0] 形式に対応する正規表現
  const startRe = new RegExp(
    `^##\\s+\\[v?${escapedVersion}\\]`
  );

  let capturing = false;
  const captured = [];

  for (const line of lines) {
    if (capturing) {
      // 次のバージョン見出しで終端する
      if (/^##\s+\[/.test(line)) break;
      captured.push(line);
    } else if (startRe.test(line)) {
      capturing = true;
      // 見出し行自体は本文に含めない
    }
  }

  if (!capturing) return null;

  // 先頭・末尾の空行をトリムする
  const text = captured.join("\n").trim();
  return text || null;
}

/**
 * ディレクトリの CHANGELOG.md を読み込んで指定バージョンのノートを抽出する
 * @param {string} [dir=process.cwd()] - リポジトリのディレクトリ
 * @param {string} version - 対象バージョン（例: "1.2.0"）
 * @returns {string|null} 抽出されたノート、CHANGELOG.md が存在しないかバージョンが見つからない場合は null
 */
export function extractChangelog(dir, version) {
  const cwd = dir ? resolve(dir) : process.cwd();

  let content;
  try {
    content = readFileSync(resolve(cwd, "CHANGELOG.md"), "utf8");
  } catch {
    return null;
  }

  return extractChangelogSection(content, version);
}
