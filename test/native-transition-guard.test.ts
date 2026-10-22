import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOTS = ['src', 'app'];
// Matches a class token like `transition-colors` / `duration-200` not preceded by `web:`.
const UNSCOPED = /(?<![\w:-])(?:transition|duration)-[\w[\],.-]+/g;

function sourceFiles() {
  return ROOTS.flatMap((root) =>
    readdirSync(root, { recursive: true, encoding: 'utf8' })
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => path.join(root, f)),
  );
}

describe('NativeWind transition classes', () => {
  it('are web-only, since css-interop transitions crash on native with Reanimated 4', () => {
    const offenders = sourceFiles().flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*)/.test(line))
        .flatMap((line) => line.match(UNSCOPED) ?? [])
        .map((token) => `${file}: ${token}`),
    );
    expect(offenders).toEqual([]);
  });
});
