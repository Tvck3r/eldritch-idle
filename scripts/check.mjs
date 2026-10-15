// Pre-deploy sanity check: every script parses, and every file index.html
// references actually exists. Run with `pnpm check`.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src';
let failed = false;

for (const f of readdirSync(SRC).filter(f => f.endsWith('.js'))) {
  try {
    execFileSync(process.execPath, ['--check', join(SRC, f)], { stdio: 'pipe' });
    console.log(`ok    ${f}`);
  } catch (e) {
    failed = true;
    console.error(`FAIL  ${f}\n${e.stderr}`);
  }
}

const html = readFileSync(join(SRC, 'index.html'), 'utf8');
for (const [, ref] of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) {
  if (!existsSync(join(SRC, ref))) {
    failed = true;
    console.error(`FAIL  index.html references missing file: ${ref}`);
  }
}

if (failed) process.exit(1);
console.log('All checks passed.');
