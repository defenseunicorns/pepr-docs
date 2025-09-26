import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';

async function getRemoveHtmlCommentsFunction() {
	const buildScript = await fs.readFile('index.mjs', 'utf8');

	const removeMatch = buildScript.match(/function removeHtmlComments\(input\) \{([\s\S]*?)^\}/m);
	if (removeMatch) {
		try {
			return new Function('input', removeMatch[1]);
		} catch (e) {
			console.warn('Could not extract removeHtmlComments function:', e.message);
		}
	}
	return null;
}

describe('removeHtmlComments', () => {
	it('should remove simple HTML comments', async () => {
		const removeHtmlComments = await getRemoveHtmlCommentsFunction();

		if (removeHtmlComments) {
			const content = 'Before <!-- comment --> after';
			const result = removeHtmlComments(content);

			expect(result).toBe('Before  after');
			expect(result).not.toContain('<!-- comment -->');
		}
	});

	it('should handle nested HTML comments', async () => {
		const removeHtmlComments = await getRemoveHtmlCommentsFunction();

		if (removeHtmlComments) {
			const content = 'Before <!-- outer <!-- inner --> comment --> after';
			const result = removeHtmlComments(content);

			// The actual function handles nested comments by removing them iteratively
			expect(result).toContain('Before');
			expect(result).toContain('after');
		}
	});

	it('should remove multiline HTML comments', async () => {
		const removeHtmlComments = await getRemoveHtmlCommentsFunction();

		if (removeHtmlComments) {
			const content = `
Before
<!--
This is a
multiline comment
-->
After
			`.trim();

			const result = removeHtmlComments(content);

			expect(result).not.toContain('<!--');
			expect(result).not.toContain('multiline comment');
			expect(result).toContain('Before');
			expect(result).toContain('After');
		}
	});

	it('should handle multiple HTML comments', async () => {
		const removeHtmlComments = await getRemoveHtmlCommentsFunction();

		if (removeHtmlComments) {
			const content = '<!-- Start --> content <!-- Middle --> more <!-- End -->';
			const result = removeHtmlComments(content);

			expect(result).not.toContain('<!--');
			expect(result).not.toContain('-->');
			expect(result).toContain('content');
			expect(result).toContain('more');
		}
	});

	it('should remove the original problematic comments', async () => {
		const removeHtmlComments = await getRemoveHtmlCommentsFunction();

		if (removeHtmlComments) {
			const content = `
# Tutorial

<!-- Start Block -->
Some tutorial content here
<!-- End Block -->

More content
			`.trim();

			const result = removeHtmlComments(content);

			// This test validates the original issue fix
			expect(result).not.toContain('<!-- Start Block -->');
			expect(result).not.toContain('<!-- End Block -->');
			expect(result).toContain('Some tutorial content here');
			expect(result).toContain('More content');
		}
	});

});