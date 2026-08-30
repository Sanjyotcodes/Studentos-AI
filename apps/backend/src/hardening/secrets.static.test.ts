// Phase 15 (T15.5): no secret in any tracked file. Walks the whole repo
// (excluding node_modules and build output) looking for real-looking API-key
// or private-key shapes, confirms every .env.example file lists variable
// names with empty values only, and confirms .gitignore actually excludes
// real .env files while keeping the .example templates trackable.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// apps/backend/src/hardening -> apps/backend/src -> apps/backend -> apps -> repo root
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'coverage',
  '.turbo',
  '.vercel',
  '.claude',
  '.vscode',
  '.idea',
]);

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml', '.prisma']);

function listFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Google API key', pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'Anthropic API key', pattern: /sk-ant-[a-zA-Z0-9_-]{20,}/ },
  { name: 'AWS access key id', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'PEM private key block', pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
];

describe('T15.5: no secret in any tracked file', () => {
  it('no source/config file in the repo contains a real-looking API key or private key', () => {
    const files = listFiles(REPO_ROOT).filter((f) => SCAN_EXTENSIONS.has(f.slice(f.lastIndexOf('.'))));

    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      for (const { name, pattern } of SECRET_PATTERNS) {
        if (pattern.test(content)) {
          offenders.push(`${relative(REPO_ROOT, file)} (matched: ${name})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every .env.example / .env.local.example file lists variable names only, with empty values', () => {
    const envExampleFiles = listFiles(REPO_ROOT).filter((f) => f.endsWith('.example'));
    expect(envExampleFiles.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of envExampleFiles) {
      const lines = readFileSync(file, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const value = trimmed.slice(eq + 1).trim();
        if (value.length > 0) {
          offenders.push(`${relative(REPO_ROOT, file)}: "${trimmed}" has a non-empty value`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('.gitignore excludes real .env files while keeping .env.example tracked', () => {
    const gitignoreLines = readFileSync(join(REPO_ROOT, '.gitignore'), 'utf-8')
      .split('\n')
      .map((l) => l.trim());

    expect(gitignoreLines).toContain('.env');
    expect(gitignoreLines).toContain('!.env.example');
  });
});
