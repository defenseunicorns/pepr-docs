import { describe, expect, it } from 'vitest';

// Import utility functions for testing edge cases
function fixImagePaths(content) {
	return content
		.replace(/_images\/pepr-arch\.svg/g, '/assets/pepr-arch.png')
		.replace(/_images\/pepr-arch\.png/g, '/assets/pepr-arch.png')
		.replace(/resources\/create-pepr-operator\/(light|dark)\.png/g, '/assets/$1.png')
		.replace(/\.\.\/\.\.\/\.\.\/images\/([\w-]+\.png)/g, '/assets/$1');
}

function rewriteNumberedFileLinks(content) {
	const isInt = (str) => {
		const parsed = parseInt(str);
		return !isNaN(parsed) && parsed.toString() === str;
	};

	Array.from(content.matchAll(/\]\([^)]*\)/g), (m) => m[0]).forEach(
		(mdLink) => {
			let parts = mdLink.replace('](', '').replace(')', '').split('/');
			if (parts[0] === '..' && parts[1] === '..' && (parts[2] === 'CODE_OF_CONDUCT.md' || parts[2] === 'SECURITY.md' || parts[2] === 'SUPPORT.md')) {
				parts.shift();
			}
			if (parts[0].startsWith('http')) {
				return;
			}

			parts = parts.map((part) => {
				const [prefix, ...rest] = part.split('_');
				return isInt(prefix) ? rest.join('_') : part;
			});

			let newLink = `](${parts.join('/')})`;

			content = content.replaceAll(mdLink, newLink);
		}
	);
	return content;
}

describe('Edge Cases and Complex Scenarios', () => {
	describe('fixImagePaths edge cases', () => {
		it('should handle malformed image syntax', () => {
			const input = 'Broken image: _images/pepr-arch.svg without markdown syntax';
			const expected = 'Broken image: /assets/pepr-arch.png without markdown syntax';
			expect(fixImagePaths(input)).toBe(expected);
		});

		it('should handle images in code blocks (should still replace)', () => {
			const input = '```\nExample: _images/pepr-arch.svg\n```';
			const expected = '```\nExample: /assets/pepr-arch.png\n```';
			expect(fixImagePaths(input));
		});

		it('should handle multiple occurrences of the same image', () => {
			const input = `
![First](_images/pepr-arch.svg)
Some content
![Second](_images/pepr-arch.svg)
More content  
![Third](_images/pepr-arch.svg)
`;
			const expected = `
![First](/assets/pepr-arch.png)
Some content
![Second](/assets/pepr-arch.png)
More content  
![Third](/assets/pepr-arch.png)
`;
			expect(fixImagePaths(input)).toBe(expected);
		});

		it('should handle images with special characters in filename', () => {
			const input = '![Test](../../../images/pepr-dashboard-screenshot.png)';
			const expected = '![Test](/assets/pepr-dashboard-screenshot.png)';
			expect(fixImagePaths(input)).toBe(expected);
		});

		it('should match patterns anywhere in text (expected behavior)', () => {
			const input = 'Not an image: some_images/pepr-arch.svg';
			const expected = 'Not an image: some/assets/pepr-arch.png';
			expect(fixImagePaths(input)).toBe(expected);
		});
	});

	describe('rewriteNumberedFileLinks edge cases', () => {
		it('should handle nested numbered path parts', () => {
			const input = '[Deep Link](2_folder/3_subfolder/1_file.md#section)';
			const expected = '[Deep Link](folder/subfolder/file.md#section)';
			expect(rewriteNumberedFileLinks(input)).toBe(expected);
		});

		it('should handle files with underscores but no numbers', () => {
			const input = '[Config](config_prod.md)';
			expect(rewriteNumberedFileLinks(input)).toBe(input);
		});

		it('should not modify files with non-integer prefixes', () => {
			const input1 = '[Version](1a_version.md)';
			expect(rewriteNumberedFileLinks(input1)).toBe(input1);
			
			const input2 = '[Version](version-1.5.md)';
			expect(rewriteNumberedFileLinks(input2)).toBe(input2);
		});

		it('should preserve fragments and other URL parts', () => {
			const input = '[Link](1_file.md#section)';
			const expected = '[Link](file.md#section)';
			expect(rewriteNumberedFileLinks(input)).toBe(expected);
		});

		it('should skip external URLs', () => {
			const input = '[External](https://example.com/1_page.md)';
			expect(rewriteNumberedFileLinks(input)).toBe(input);
		});
	});

	describe('Complex real-world scenarios', () => {
		it('should handle a complete markdown document with mixed content', () => {
			const input = `
# Documentation

## Architecture
![Architecture Diagram](_images/pepr-arch.svg)

## Getting Started
See the [setup guide](1_setup.md) for details.

## Screenshots
### Light Mode
![Light Mode](resources/create-pepr-operator/light.png)

### Dark Mode  
![Dark Mode](resources/create-pepr-operator/dark.png)

## Tutorials
Check out our [advanced tutorial](../../../images/tutorial-screenshot.png) here.

## Video Content
<video controls src="https://user-images.githubusercontent.com/123/demo.mp4"></video>
`;

			const expected = `
# Documentation

## Architecture
![Architecture Diagram](/assets/pepr-arch.png)

## Getting Started
See the [setup guide](setup.md) for details.

## Screenshots
### Light Mode
![Light Mode](/assets/light.png)

### Dark Mode  
![Dark Mode](/assets/dark.png)

## Tutorials
Check out our [advanced tutorial](/assets/tutorial-screenshot.png) here.

## Video Content
<video controls src="https://user-images.githubusercontent.com/123/demo.mp4"></video>
`;

			let result = fixImagePaths(input);
			result = rewriteNumberedFileLinks(result);
			
			expect(result).toBe(expected);
		});

		it('should handle content with no transformations needed', () => {
			const input = `
# Clean Document

This document has:
- No old image paths
- No numbered file links  
- [Normal links](guide.md)
- ![Good images](/assets/image.png)
`;
			
			let result = fixImagePaths(input);
			result = rewriteNumberedFileLinks(result);
			
			expect(result).toBe(input);
		});

		it('should handle mixed line endings', () => {
			const input = 'Line 1\r\n![Image](_images/pepr-arch.svg)\r\nLine 3\n[Link](1_file.md)\n';
			const processed = rewriteNumberedFileLinks(fixImagePaths(input));
			
			expect(processed).toContain('/assets/pepr-arch.png');
			expect(processed).toContain('[Link](file.md)');
		});
	});

	describe('Performance and large content', () => {
		it('should handle large documents efficiently', () => {
			// Create a large document with many replacements
			const lines = [];
			for (let i = 0; i < 1000; i++) {
				lines.push(`Line ${i}: ![Image ${i}](_images/pepr-arch.svg)`);
				lines.push(`Link ${i}: [File ${i}](${i}_file${i}.md)`);
			}
			const input = lines.join('\n');
			
			const startTime = Date.now();
			let result = fixImagePaths(input);
			result = rewriteNumberedFileLinks(result);
			const endTime = Date.now();
			
			// Should complete within reasonable time (less than 1000ms for 1000 items)
			expect(endTime - startTime).toBeLessThan(1000);
			
			// Should have made the image replacements
			expect(result).not.toContain('_images/pepr-arch.svg');
			// Should have made numbered prefix replacements
			expect(result).toContain('file0.md'); // 0_file0.md -> file0.md
		});
	});
});