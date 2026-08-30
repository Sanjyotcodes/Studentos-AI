// STATIC invariants from PLAN.md §4 — enforced as real, running tests rather
// than a one-time manual grep, so a later phase (e.g. Phase 12's note
// summarization, which is also supposed to route through ai.service.ts)
// can't silently reintroduce a second Gemini import or a second reader of
// the raw API key.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(__dirname, '..', '..');

function listTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listTsFiles(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

function toRelative(files: string[]): string[] {
  return files.map((f) => relative(SRC_ROOT, f).replace(/\\/g, '/')).sort();
}

// Comments are allowed to mention the package/env-var by name (several
// modules do, to document the invariant) — only real code counts here.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('T10.1: @google/genai is imported in exactly one file', () => {
  it('only modules/ai/ai.service.ts imports the Gemini SDK', () => {
    const files = listTsFiles(SRC_ROOT);
    const importers = files.filter((f) =>
      /from\s+['"]@google\/genai['"]|require\(['"]@google\/genai['"]\)/.test(
        stripComments(readFileSync(f, 'utf-8')),
      ),
    );
    expect(toRelative(importers)).toEqual(['modules/ai/ai.service.ts']);
  });
});

describe('T10.2: GEMINI_API_KEY is read in exactly one place', () => {
  it('no file other than config/env.ts touches process.env for it directly', () => {
    const files = listTsFiles(SRC_ROOT).filter((f) => !f.endsWith(join('config', 'env.ts')));
    const rawReaders = files.filter((f) =>
      /process\.env(\.GEMINI_API_KEY|\[['"]GEMINI_API_KEY['"]\])/.test(readFileSync(f, 'utf-8')),
    );
    expect(rawReaders).toEqual([]);
  });

  it('the only consumers of the validated key outside env.ts are ai.service.ts and the redacting logger', () => {
    const files = listTsFiles(SRC_ROOT).filter((f) => !f.endsWith(join('config', 'env.ts')));
    const consumers = files.filter((f) => readFileSync(f, 'utf-8').includes('GEMINI_API_KEY'));
    // lib/logger.ts reads the key only to scrub it from log output (Phase 15,
    // T15.7) — it never sends the value anywhere and never calls the Gemini
    // API, so this is a deliberate second consumer, not a regression of the
    // "only ai.service.ts calls Gemini" invariant (PLAN.md §4.4).
    expect(toRelative(consumers)).toEqual(['lib/logger.ts', 'modules/ai/ai.service.ts']);
  });

  it('is never interpolated into a thrown error or logged from ai.service.ts', () => {
    const serviceSrc = stripComments(
      readFileSync(join(SRC_ROOT, 'modules', 'ai', 'ai.service.ts'), 'utf-8'),
    );
    const leaked = /(?:throw|console\.\w+)[^;]*GEMINI_API_KEY/s.test(serviceSrc);
    expect(leaked).toBe(false);
  });
});
