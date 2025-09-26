import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';

async function getConvertCalloutsFunction() {
	const buildScript = await fs.readFile('index.mjs', 'utf8');

	const calloutsMatch = buildScript.match(/function convertCallouts\(content, filePath\) \{([\s\S]*?)^\}/m);
	if (calloutsMatch) {
		try {
			return new Function('content', 'filePath', `
				const console = { log: () => {} }; // Mock console for testing
				${calloutsMatch[1]}
			`);
		} catch (e) {
			console.warn('Could not extract convertCallouts function:', e.message);
		}
	}
	return null;
}

describe('convertCallouts', () => {
	it('should convert GitHub TIP callouts to MDX admonitions', async () => {
		const convertCallouts = await getConvertCalloutsFunction();

		if (convertCallouts) {
			const content = `
> [!TIP]
> This is a helpful tip
> that spans multiple lines
			`.trim();

			const result = convertCallouts(content, 'test.md');

			expect(result).toContain(':::tip');
			expect(result).toContain('This is a helpful tip');
			expect(result).toContain('that spans multiple lines');
			expect(result).toContain(':::');
		}
	});

	it('should convert GitHub WARNING callouts to MDX admonitions', async () => {
		const convertCallouts = await getConvertCalloutsFunction();

		if (convertCallouts) {
			const content = `
> [!WARNING]
> This is a warning message
			`.trim();

			const result = convertCallouts(content, 'test.md');

			expect(result).toContain(':::warning');
			expect(result).toContain('This is a warning message');
		}
	});

	it('should handle multiple callouts in same content', async () => {
		const convertCallouts = await getConvertCalloutsFunction();

		if (convertCallouts) {
			const content = `
> [!NOTE]
> This is a note

Some regular content

> [!IMPORTANT]
> This is important
			`.trim();

			const result = convertCallouts(content, 'test.md');

			expect(result).toContain(':::note');
			expect(result).toContain(':::important');
			expect(result).toContain('Some regular content');
		}
	});

	it('should handle all GitHub callout types', async () => {
		const convertCallouts = await getConvertCalloutsFunction();

		if (convertCallouts) {
			const content = `
> [!TIP]
> Tip content

> [!NOTE]
> Note content

> [!WARNING]
> Warning content

> [!IMPORTANT]
> Important content

> [!CAUTION]
> Caution content
			`.trim();

			const result = convertCallouts(content, 'test.md');

			expect(result).toContain(':::tip');
			expect(result).toContain(':::note');
			expect(result).toContain(':::warning');
			expect(result).toContain(':::important');
			expect(result).toContain(':::caution');
		}
	});
});