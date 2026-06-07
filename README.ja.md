> English version: [README.md](README.md)

# release-yoshi (日本語)

`package.json` のバージョン変更を `git diff` で検出し、git タグと GitHub Release を自動作成するツール。ゼロ依存設計。

## インストール

```bash
npm install -g release-yoshi
```

ローカルクローンから使う場合:

```bash
git clone https://github.com/aliksir/release-yoshi.git
cd release-yoshi
npm link
```

## 使い方

`package.json` のバージョンを上げたコミットの後、git リポジトリ内で実行:

```bash
release-yoshi
```

バージョン変更が検出されない場合、終了コード 0 で静かに終了します。

### オプション

| オプション | 説明 |
|-----------|------|
| `--dir <path>` | 対象リポジトリのディレクトリ（デフォルト: カレントディレクトリ） |
| `--dry-run` | 実行せず、何が行われるかを表示 |
| `--no-push` | タグをローカルに作成し、origin への push をスキップ |
| `-h, --help` | ヘルプメッセージを表示 |

### 使用例

```bash
# プレビュー（実行なし）
release-yoshi --dry-run

# 別のリポジトリに対して実行
release-yoshi --dir /path/to/repo

# タグをローカルのみに作成（pushしない）
release-yoshi --no-push
```

## 仕組み

release-yoshi は3つのステップを順番に実行します:

### 1. 検出 (`src/detector.mjs`)

`git diff` で `HEAD~1` と `HEAD` の間の `package.json` を比較。`"version"` フィールドが変更され、**かつ**新しいバージョンがセマンティックバージョニングで増加している場合にリリースを実行します。

### 2. 変更履歴の抽出 (`src/changelog.mjs`)

`CHANGELOG.md` が存在する場合、新バージョンに該当するセクションを抽出します。[Keep a Changelog](https://keepachangelog.com/) 形式（`## [x.y.z]` 見出し）に対応。該当セクションがない場合は `gh release create --generate-notes` でリリースノートを自動生成します。

### 3. リリース (`src/releaser.mjs`)

- git タグ `vX.Y.Z` を作成
- タグを `origin` に push
- `gh release create` で GitHub Release を作成
- タグが既に存在する場合はスキップ

## 動作要件

- **Node.js** >= 18（テストに `node:test` を使用）
- **git** — バージョン検出とタグ作成に必要
- **[gh CLI](https://cli.github.com/)** — GitHub Release の作成に必要

## ライセンス

MIT
