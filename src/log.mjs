import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const LOG_DIR = join(homedir(), '.neko-hq');
const LOG_FILE = join(LOG_DIR, 'stats.jsonl');

// リリース統計エントリを ~/.neko-hq/stats.jsonl に追記する
export function appendLog(entry) {
  try {
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }
    appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    // ログ書き込み失敗は警告のみ — ログはベストエフォート
    process.stderr.write(`[release-yoshi] log write failed: ${err.message}\n`);
  }
}
