/**
 * Un fișier cu 'use server' are voie să exporte doar funcții async (și tipuri). Altfel Next refuză
 * toate acțiunile de pe pagină și orice apel la server dă 500 (s-a întâmplat cu taste-tour.ts).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from 'vitest';

const ROOT = join(import.meta.dirname, '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'node_modules' ? [] : files(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

test("fișierele 'use server' exportă doar funcții async și tipuri", () => {
  const bad: string[] = [];
  for (const file of files(ROOT)) {
    const src = readFileSync(file, 'utf8');
    if (!/^\s*(['"])use server\1;?/.test(src.replace(/^\s*\/\*[\s*\S]*?\*\/\s*/, ''))) continue;
    for (const line of src.split('\n')) {
      const m = line.match(/^export\s+(?!async\s+function\b|type\b|interface\b|default\s+async\s+function\b)(\S+(?:\s+\S+)?)/);
      if (m) bad.push(`${relative(ROOT, file)}: ${line.trim().slice(0, 80)}`);
      if (/^export\s*\{/.test(line)) bad.push(`${relative(ROOT, file)}: ${line.trim().slice(0, 80)} (re-export: verifică să fie doar funcții async)`);
    }
  }
  expect(bad).toEqual([]);
});
