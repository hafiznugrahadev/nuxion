// @vitest-environment node
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const nextManifestPath = require.resolve('next/package.json');
const requireFromNext = createRequire(nextManifestPath);

function versionTuple(value: string): number[] {
  expect(value).toMatch(/^\d+\.\d+\.\d+$/);
  return value.split('.').map(Number);
}

function atLeast(actual: string, minimum: string): boolean {
  const left = versionTuple(actual);
  const right = versionTuple(minimum);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i]! > right[i]!;
  }
  return true;
}

describe('resolved security dependency floors', () => {
  it('uses the patched Next.js runtime', () => {
    const manifest = require(nextManifestPath) as { version: string };
    expect(atLeast(manifest.version, '16.4.1')).toBe(true);
  });
  it('resolves patched sharp from the Next.js dependency context', () => {
    let directory = dirname(requireFromNext.resolve('sharp'));
    while (true) {
      try {
        const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as {
          name: string;
          version: string;
        };
        if (manifest.name === 'sharp') {
          expect(atLeast(manifest.version, '0.35.5')).toBe(true);
          return;
        }
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      }
      const parent = dirname(directory);
      if (parent === directory) throw new Error('Resolved sharp package manifest was not found');
      directory = parent;
    }
  });
});
