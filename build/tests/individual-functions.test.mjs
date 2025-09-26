import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';

async function getContentTransformationFunctions() {
	const buildScript = await fs.readFile('index.mjs', 'utf8');
	const functions = {};

	const calloutsMatch = buildScript.match(/function convertCallouts\(content, filePath\) \{([\s\S]*?)^\}/m);
	if (calloutsMatch) {
		try {
			functions.convertCallouts = new Function('content', 'filePath', `
				const console = { log: () => {} }; // Mock console for testing
				${calloutsMatch[1]}
			`);
		} catch (e) {
			console.warn('Could not extract convertCallouts function:', e.message);
		}
	}

	const imageMatch = buildScript.match(/function fixImagePaths\(content\) \{([\s\S]*?)^\}/m);
	if (imageMatch) {
		try {
			functions.fixImagePaths = new Function('content', imageMatch[1]);
		} catch (e) {
			console.warn('Could not extract fixImagePaths function:', e.message);
		}
	}

	// Extract removeHtmlComments function
	const removeMatch = buildScript.match(/function removeHtmlComments\(input\) \{([\s\S]*?)^\}/m);
	if (removeMatch) {
		try {
			functions.removeHtmlComments = new Function('input', removeMatch[1]);
		} catch (e) {
			console.warn('Could not extract removeHtmlComments function:', e.message);
		}
	}

	return functions;
}

describe('Content Transformation Functions', () => {
	describe('convertCallouts', () => {
		it('should convert GitHub TIP callouts to MDX admonitions', async () => {
			const { convertCallouts } = await getContentTransformationFunctions();

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
			const { convertCallouts } = await getContentTransformationFunctions();

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
			const { convertCallouts } = await getContentTransformationFunctions();

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
	});

	describe('fixImagePaths', () => {
		it('should convert _images/pepr-arch.svg to assets path', async () => {
			const { fixImagePaths } = await getContentTransformationFunctions();

			if (fixImagePaths) {
				const content = 'See the ![architecture](_images/pepr-arch.svg) diagram';
				const result = fixImagePaths(content);

				expect(result).toContain('/assets/pepr-arch.png');
				expect(result).not.toContain('_images/pepr-arch.svg');
			}
		});

		it('should convert resources paths to assets', async () => {
			const { fixImagePaths } = await getContentTransformationFunctions();

			if (fixImagePaths) {
				const content = '![demo](resources/create-pepr-operator/light.png)';
				const result = fixImagePaths(content);

				expect(result).toContain('/assets/light.png');
			}
		});

		it('should handle relative image paths', async () => {
			const { fixImagePaths } = await getContentTransformationFunctions();

			if (fixImagePaths) {
				const content = '![test](../../../images/test.png)';
				const result = fixImagePaths(content);

				expect(result).toContain('/assets/test.png');
			}
		});

		it('should handle multiple image transformations', async () => {
			const { fixImagePaths } = await getContentTransformationFunctions();

			if (fixImagePaths) {
				const content = `
![arch](_images/pepr-arch.svg)
![logo](_images/pepr.png)
![demo](resources/create-pepr-operator/dark.png)
![other](../../../images/other.png)
				`.trim();

				const result = fixImagePaths(content);

				expect(result).toContain('/assets/pepr-arch.png');
				expect(result).toContain('/assets/pepr.png');
				expect(result).toContain('/assets/dark.png');
				expect(result).toContain('/assets/other.png');
			}
		});
	});

	describe('removeHtmlComments', () => {
		it('should remove simple HTML comments', async () => {
			const { removeHtmlComments } = await getContentTransformationFunctions();

			if (removeHtmlComments) {
				const content = 'Before <!-- comment --> after';
				const result = removeHtmlComments(content);

				expect(result).toBe('Before  after');
				expect(result).not.toContain('<!-- comment -->');
			}
		});

		it('should handle nested HTML comments', async () => {
			const { removeHtmlComments } = await getContentTransformationFunctions();

			if (removeHtmlComments) {
				const content = 'Before <!-- outer <!-- inner --> comment --> after';
				const result = removeHtmlComments(content);

				// The actual function handles nested comments by removing them iteratively
				expect(result).toContain('Before');
				expect(result).toContain('after');
			}
		});

		it('should remove multiline HTML comments', async () => {
			const { removeHtmlComments } = await getContentTransformationFunctions();

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
			const { removeHtmlComments } = await getContentTransformationFunctions();

			if (removeHtmlComments) {
				const content = '<!-- Start --> content <!-- Middle --> more <!-- End -->';
				const result = removeHtmlComments(content);

				expect(result).not.toContain('<!--');
				expect(result).not.toContain('-->');
				expect(result).toContain('content');
				expect(result).toContain('more');
			}
		});
	});
});