// @vitest-environment node

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '..');
const sourceRoots = ['app', 'components', 'hooks', 'lib'];

function sourceFiles() {
  const files: string[] = [];
  const walk = (relativeDirectory: string) => {
    for (const entry of readdirSync(resolve(projectRoot, relativeDirectory), { withFileTypes: true })) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) walk(relativePath);
      else if (/\.(?:ts|tsx|css)$/.test(entry.name) && !entry.name.endsWith('.test.tsx')) files.push(relativePath);
    }
  };
  sourceRoots.forEach(walk);
  return files;
}

describe('design system source rules', () => {
  it('keeps literal colors in globals.css only', () => {
    const violations = sourceFiles()
      .filter((file) => file !== 'app/globals.css')
      .filter((file) => /#[0-9a-f]{3,8}\b|rgba?\s*\(/i.test(readFileSync(resolve(projectRoot, file), 'utf8')));
    expect(violations).toEqual([]);
  });

  it('does not reintroduce shadows, gradients, or native confirm dialogs', () => {
    const violations = sourceFiles().filter((file) => file !== 'app/globals.css').filter((file) => {
      const source = readFileSync(resolve(projectRoot, file), 'utf8');
      return /box-shadow|boxShadow|(?:linear|radial)-gradient|\bconfirm\s*\(/.test(source);
    });
    expect(violations).toEqual([]);
  });
});
