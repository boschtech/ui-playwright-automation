import fs from "node:fs";
import path from "node:path";

/**
 * Lightweight loader for `.env.local` / `.env` files. Runs once at import time.
 * Supports `KEY=value`, `export KEY=value`, and quoted values. Existing
 * `process.env` entries are not overwritten.
 */
function parseAndApply(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const repoRoot = path.resolve(__dirname, "..");
parseAndApply(path.join(repoRoot, ".env.local"));
parseAndApply(path.join(repoRoot, ".env"));
