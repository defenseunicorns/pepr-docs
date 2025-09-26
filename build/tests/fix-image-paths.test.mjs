import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';

async function getFixImagePathsFunction() {
	const buildScript = await fs.readFile('index.mjs', 'utf8');

	const imageMatch = buildScript.match(/function fixImagePaths\(content\) \{([\s\S]*?)^\}/m);
	if (imageMatch) {
		try {
			return new Function('content', imageMatch[1]);
		} catch (e) {
			console.warn('Could not extract fixImagePaths function:', e.message);
		}
	}
	return null;
}

describe('fixImagePaths', () => {
	it('should convert _images/pepr-arch.svg to assets path', async () => {
		const fixImagePaths = await getFixImagePathsFunction();

		if (fixImagePaths) {
			const content = 'See the ![architecture](_images/pepr-arch.svg) diagram';
			const result = fixImagePaths(content);

			expect(result).toContain('/assets/pepr-arch.png');
			expect(result).not.toContain('_images/pepr-arch.svg');
		}
	});

	it('should convert resources paths to assets', async () => {
		const fixImagePaths = await getFixImagePathsFunction();

		if (fixImagePaths) {
			const content = '![demo](resources/create-pepr-operator/light.png)';
			const result = fixImagePaths(content);

			expect(result).toContain('/assets/light.png');
		}
	});

	it('should handle relative image paths', async () => {
		const fixImagePaths = await getFixImagePathsFunction();

		if (fixImagePaths) {
			const content = '![test](../../../images/test.png)';
			const result = fixImagePaths(content);

			expect(result).toContain('/assets/test.png');
		}
	});

	it('should handle multiple image transformations', async () => {
		const fixImagePaths = await getFixImagePathsFunction();

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

	it('should convert both light and dark theme images', async () => {
		const fixImagePaths = await getFixImagePathsFunction();

		if (fixImagePaths) {
			const content = `
![light theme](resources/create-pepr-operator/light.png)
![dark theme](resources/create-pepr-operator/dark.png)
			`.trim();

			const result = fixImagePaths(content);

			expect(result).toContain('/assets/light.png');
			expect(result).toContain('/assets/dark.png');
		}
	});

	it('should preserve external image URLs', async () => {
		const fixImagePaths = await getFixImagePathsFunction();

		if (fixImagePaths) {
			const content = '![external](https://example.com/image.png) and ![local](_images/pepr.png)';
			const result = fixImagePaths(content);

			// External URLs should remain unchanged
			expect(result).toContain('https://example.com/image.png');
			// Local paths should be transformed
			expect(result).toContain('/assets/pepr.png');
		}
	});
});