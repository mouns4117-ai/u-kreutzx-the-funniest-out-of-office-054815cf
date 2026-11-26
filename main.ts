import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const ENTRY =
  "Out of office until Monday. My inbox is being handled by my cat, who has already approved your budget and eaten the contract.";

const OUT_DIR = "/output";
const OUT_FILE = `${OUT_DIR}/entry.txt`;

function failFast(entry: string): void {
  // Fail fast before touching /output: the gate is checked twice,
  // once here on the raw string and once in main() before the write.
  const bytes = Buffer.byteLength(entry, "utf8");
  if (bytes === 0 || bytes > 140) {
    throw new Error(`entry is ${bytes} bytes, gate is 1-140 characters`);
  }
  if (!/^[^\n\r]+$/.test(entry)) {
    throw new Error("entry must be exactly one non-empty line");
  }
}

function main(): void {
  failFast(ENTRY);
  // Gate: UTF-8 text of 1 to 140 characters, not only white space, one line.
  const chars = [...ENTRY].length;
  if (chars < 1 || chars > 140) {
    throw new Error(`entry is ${chars} characters, gate is 1-140`);
  }
  if (ENTRY.trim().length === 0) {
    throw new Error("entry is only white space");
  }
  if (ENTRY.includes("\n") || ENTRY.includes("\r")) {
    throw new Error("entry must be a single line");
  }

  // /output is a shared mounted directory: empty its CONTENTS only,
  // never remove the directory itself.
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }
  for (const name of readdirSync(OUT_DIR)) {
    rmSync(`${OUT_DIR}/${name}`, { recursive: true, force: true });
  }

  writeFileSync(OUT_FILE, ENTRY, "utf8");

  // Verify with a sha256 read-back.
  const written = readFileSync(OUT_FILE, "utf8");
  if (written !== ENTRY) {
    throw new Error("read-back mismatch: /output/entry.txt differs from the entry");
  }
  const digest = createHash("sha256").update(written, "utf8").digest("hex");
  console.log(`wrote ${OUT_FILE}: ${chars} chars, sha256 ${digest}`);
}

main();
