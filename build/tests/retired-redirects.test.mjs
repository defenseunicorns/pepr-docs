import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const retiredRedirectsPath = path.join(projectRoot, 'retired-redirects.js');

async function getRetiredRedirectsContent() {
  return await fs.readFile(retiredRedirectsPath, 'utf8');
}

describe('Retired Version Redirects Generation', () => {
  const testCases = [
    { name: 'should export retiredVersionRedirects', expected: 'export const retiredVersionRedirects' },
    { name: 'should export retiredVersions', expected: 'export const retiredVersions' },
    { name: 'should use wildcard redirects to root', expected: '/:path*' },
    { name: 'should be auto-generated', expected: 'Auto-generated' },
  ];

  it.each(testCases)('$name', async ({ expected }) => {
    const content = await getRetiredRedirectsContent();
    expect(content).toContain(expected);
  });
});
