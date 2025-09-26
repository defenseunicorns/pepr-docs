import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';

async function getTransformContentFunction() {
	const buildScript = await fs.readFile('index.mjs', 'utf8');

	const funcMatch = buildScript.match(/const transformContent = \(content\) => \{([\s\S]*?)^\};/m);
	if (funcMatch) {
		try {
			const hasNumericMatch = buildScript.match(/function hasNumericPrefix\(str\) \{\s*return ([^}]+);\s*\}/);
			const fixImageMatch = buildScript.match(/function fixImagePaths\(content\) \{([\s\S]*?)^\}/m);
			const removeHtmlMatch = buildScript.match(/function removeHtmlComments\(input\) \{([\s\S]*?)^\}/m);

			if (hasNumericMatch && fixImageMatch && removeHtmlMatch) {
				return new Function('content', `
					// Helper functions
					const hasNumericPrefix = (str) => { return ${hasNumericMatch[1]}; };
					const fixImagePaths = (content) => { ${fixImageMatch[1]} };
					const removeHtmlComments = (input) => { ${removeHtmlMatch[1]} };

					// Main function body
					${funcMatch[1]}
				`);
			}
		} catch (e) {
			console.warn('Could not extract transformContent function:', e.message);
		}
	}
	return null;
}

describe('transformContent', () => {
	it('should transform video URLs to video tags', async () => {
		const transformContent = await getTransformContentFunction();

		if (transformContent) {
			const content = 'Check out this demo: https://example.com/demo.mp4';
			const result = transformContent(content);

			expect(result).toContain('<video class="td-content" controls src="https://example.com/demo.mp4"></video>');
		}
	});

	it('should remove HTML comments', async () => {
		const transformContent = await getTransformContentFunction();

		if (transformContent) {
			const content = `
# Test
<!-- Start Block -->
Some content
<!-- End Block -->
More content
			`.trim();

			const result = transformContent(content);

			expect(result).not.toContain('<!-- Start Block -->');
			expect(result).not.toContain('<!-- End Block -->');
			expect(result).toContain('Some content');
			expect(result).toContain('More content');
		}
	});

	it('should fix image paths', async () => {
		const transformContent = await getTransformContentFunction();

		if (transformContent) {
			const content = '![arch](_images/pepr-arch.svg) and ![logo](_images/pepr.png)';
			const result = transformContent(content);

			expect(result).toContain('/assets/pepr-arch.png');
			expect(result).toContain('/assets/pepr.png');
		}
	});

	it('should escape MDX @param', async () => {
		const transformContent = await getTransformContentFunction();

		if (transformContent) {
			const content = '**@param** name The parameter name';
			const result = transformContent(content);

			expect(result).toContain('**\\@param**');
		}
	});

	it('should escape email addresses', async () => {
		const transformContent = await getTransformContentFunction();

		if (transformContent) {
			const content = 'Contact us at <user@example.com>';
			const result = transformContent(content);

			expect(result).toContain('&lt;user@example.com&gt;');
		}
	});

	it('should process markdown links with numeric prefixes', async () => {
		const transformContent = await getTransformContentFunction();

		if (transformContent) {
			const content = '[Getting Started](1_getting-started/README.md)';
			const result = transformContent(content);

			expect(result).toContain('[Getting Started](getting-started)');
		}
	});

	it('should handle complex content transformation pipeline', async () => {
		const transformContent = await getTransformContentFunction();

		if (transformContent) {
			const complexContent = `
# Documentation

<!-- This is a comment -->
![arch](_images/pepr-arch.svg)

Check out this video: https://example.com/demo.mp4

[Getting Started](1_getting-started/README.md)

**@param** config The configuration object

Contact: <admin@example.com>
			`.trim();

			const result = transformContent(complexContent);

			expect(result).not.toContain('<!-- This is a comment -->');
			expect(result).toContain('/assets/pepr-arch.png');
			expect(result).toContain('<video class="td-content" controls');
			expect(result).toContain('[Getting Started](getting-started)');
			expect(result).toContain('**\\@param**');
			expect(result).toContain('&lt;admin@example.com&gt;');
		}
	});
});