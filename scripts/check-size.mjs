// Entry-chunk size gate (constitution Principle II): initial JS must stay <= 300 KB gzipped.
// Reads Vite's manifest, sums the entry chunk plus its static imports, and reports lazy chunks.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const BUDGET = 300 * 1024;
const manifestPath = join(DIST, '.vite', 'manifest.json');

if (!existsSync(manifestPath)) {
  console.error(`No ${manifestPath}. Run \`npm run build\` first.`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const gz = (file) => gzipSync(readFileSync(join(DIST, file))).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
if (!entryKey) {
  console.error('No entry chunk in manifest.');
  process.exit(1);
}

// Walk static imports only: these load before first paint.
const initial = new Set();
const walk = (key) => {
  const chunk = manifest[key];
  if (!chunk || initial.has(chunk.file)) return;
  initial.add(chunk.file);
  (chunk.imports ?? []).forEach(walk);
};
walk(entryKey);

let entryTotal = 0;
console.log('Initial (entry + static imports):');
for (const file of initial) {
  const size = gz(file);
  entryTotal += size;
  console.log(`  ${file.padEnd(48)} ${kb(size)}`);
}

console.log('Lazy chunks (not counted):');
for (const chunk of Object.values(manifest)) {
  if (chunk.file.endsWith('.js') && !initial.has(chunk.file)) {
    console.log(`  ${chunk.file.padEnd(48)} ${kb(gz(chunk.file))}`);
  }
}

console.log(`\nEntry total: ${kb(entryTotal)} / budget ${kb(BUDGET)}`);
if (entryTotal > BUDGET) {
  console.error('FAIL: entry JavaScript exceeds the 300 KB gzipped budget.');
  process.exit(1);
}
console.log('PASS');
