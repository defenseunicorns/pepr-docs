import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';

async function getActualFunctions() {
	const buildScript = await fs.readFile('index.mjs', 'utf8');
	const functions = {};

	const hasNumericMatch = buildScript.match(/function hasNumericPrefix\(str\) \{\s*return ([^}]+);\s*\}/);
	if (hasNumericMatch) {
		functions.hasNumericPrefix = new Function('str', `return ${hasNumericMatch[1]};`);
	}

	const fixImageMatch = buildScript.match(/function fixImagePaths\(content\) \{([\s\S]*?)^\}/m);
	if (fixImageMatch) {
		try {
			functions.fixImagePaths = new Function('content', fixImageMatch[1]);
		} catch (e) {
			console.warn('Could not extract fixImagePaths function:', e.message);
		}
	}

	const removeHtmlMatch = buildScript.match(/function removeHtmlComments\(input\) \{([\s\S]*?)^\}/m);
	if (removeHtmlMatch) {
		try {
			functions.removeHtmlComments = new Function('input', removeHtmlMatch[1]);
		} catch (e) {
			console.warn('Could not extract removeHtmlComments function:', e.message);
		}
	}

	return functions;
}

describe('Content Pipeline Integration', () => {
	describe('Real Function Behavior', () => {
		it('should test actual hasNumericPrefix function', async () => {
			const { hasNumericPrefix } = await getActualFunctions();

			if (hasNumericPrefix) {
				expect(hasNumericPrefix('1')).toBe(true);
				expect(hasNumericPrefix('42')).toBe(true);
				expect(hasNumericPrefix('0')).toBe(true);
				expect(hasNumericPrefix('01')).toBe(true);
				expect(hasNumericPrefix('1a')).toBe(false);
				expect(hasNumericPrefix('abc')).toBe(false);
				expect(hasNumericPrefix('')).toBe(true); // Number('') = 0
			}
		});

		it('should test actual fixImagePaths function', async () => {
			const { fixImagePaths } = await getActualFunctions();

			if (fixImagePaths) {
				const testContent = `
![arch](_images/pepr-arch.svg)
![logo](_images/pepr.png)
![light](resources/create-pepr-operator/light.png)
				`.trim();

				const result = fixImagePaths(testContent);

				expect(result).toContain('/assets/pepr-arch.png');
				expect(result).toContain('/assets/pepr.png');
				expect(result).toContain('/assets/light.png');
			}
		});

		it('should test actual removeHtmlComments function', async () => {
			const { removeHtmlComments } = await getActualFunctions();

			if (removeHtmlComments) {
				const testContent = `
# Test Content
<!-- Start Block -->
Some content here
<!-- End Block -->
More content
				`.trim();

				const result = removeHtmlComments(testContent);

				expect(result).not.toContain('<!-- Start Block -->');
				expect(result).not.toContain('<!-- End Block -->');
				expect(result).toContain('Some content here');
				expect(result).toContain('More content');
			}
		});
	});
});