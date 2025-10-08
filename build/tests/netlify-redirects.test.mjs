import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const netlifyRedirectsPath = path.join(projectRoot, 'public/_redirects');

async function getNetlifyRedirectsContent() {
  return await fs.readFile(netlifyRedirectsPath, 'utf8');
}

describe('Netlify _redirects File', () => {
  const testCases = [
    { name: 'should be auto-generated with warnings', expected: 'Auto-generated' },
    { name: 'should use Netlify splat redirects with 301', expected: '/:splat  301' },
  ];

  it.each(testCases)('$name', async ({ expected }) => {
    const content = await getNetlifyRedirectsContent();
    expect(content).toContain(expected);
  });
});
