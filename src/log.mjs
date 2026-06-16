import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const LOG_DIR = join(homedir(), '.neko-hq');
const LOG_FILE = join(LOG_DIR, 'stats.jsonl');

export function appendLog(entry) {
  try {
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }
    appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    // Warn but don't crash the process — logging is best-effort
    process.stderr.write(`[release-yoshi] log write failed: ${err.message}\n`);
  }
}
