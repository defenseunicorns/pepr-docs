import { describe, expect, it } from 'vitest';

// Extract functions for testing
function rewriteRemoteVideoLinks(content) {
	return content.replace(
		/<video[^>]*\ssrc="https:\/\/user-images\.githubusercontent\.com\/[\w\/.-]+\.mp4"[^>]*><\/video>/g,
		'**Video content available in the original documentation**'
	);
}

function isInt(str) {
	const parsed = parseInt(str);
	return !isNaN(parsed) && parsed.toString() === str;
}

function rewriteNumberedFileLinks(content) {
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

function rewriteReadmeFileLinks(content) {
	return content.replace(
		/\[([^\]]+)\]\(([\w\/.-]*?)README\.md(#[\w-]*)?.*?\)/gi,
		(match, linkText, basePath, fragment) => {
			const newFragment = fragment || '';
			if (basePath === '' || basePath === './') {
				return `[${linkText}](./${newFragment})`;
			}
			return `[${linkText}](${basePath}${newFragment})`;
		}
	);
}

function rewriteFileLinksAsLowerCase(content) {
	return content.replace(
		/\[([^\]]+)\]\(([\w\/.-]+)\.md(#[\w-]*)?.*?\)/g,
		(match, linkText, path, fragment) => {
			const newFragment = fragment || '';
			const lowerPath = path.toLowerCase();
			return `[${linkText}](${lowerPath}${newFragment})`;
		}
	);
}

function majmin(version) {
	return version.replace(/^v(\d+\.\d+)\.\d+$/, 'v$1');
}

describe('rewriteRemoteVideoLinks', () => {
	it('should replace GitHub video tags with placeholder text', () => {
		const input = '<video class="td-content" controls src="https://user-images.githubusercontent.com/882485/230895880-c5623077-f811-4870-bb9f-9bb8e5edc118.mp4"></video>';
		const expected = '**Video content available in the original documentation**';
		expect(rewriteRemoteVideoLinks(input)).toBe(expected);
	});

	it('should handle multiple video tags', () => {
		const input = `
<video controls src="https://user-images.githubusercontent.com/123/video1.mp4"></video>
Some text here
<video class="demo" src="https://user-images.githubusercontent.com/456/video2.mp4"></video>
`;
		const expected = `
**Video content available in the original documentation**
Some text here
**Video content available in the original documentation**
`;
		expect(rewriteRemoteVideoLinks(input)).toBe(expected);
	});

	it('should not modify non-GitHub video sources', () => {
		const input = '<video src="/local/video.mp4"></video>';
		expect(rewriteRemoteVideoLinks(input)).toBe(input);
	});
});

describe('isInt', () => {
	it('should return true for valid integer strings', () => {
		expect(isInt('1')).toBe(true);
		expect(isInt('42')).toBe(true);
		expect(isInt('0')).toBe(true);
	});

	it('should return false for non-integer strings', () => {
		expect(isInt('1.5')).toBe(false);
		expect(isInt('abc')).toBe(false);
		expect(isInt('1a')).toBe(false);
		expect(isInt('')).toBe(false);
	});

	it('should return false for strings with leading zeros', () => {
		expect(isInt('01')).toBe(false);
		expect(isInt('007')).toBe(false);
	});
});

describe('rewriteNumberedFileLinks', () => {
	it('should remove numbered prefixes from path parts', () => {
		const input = '[Getting Started](1_getting-started.md)';
		const expected = '[Getting Started](getting-started.md)';
		expect(rewriteNumberedFileLinks(input)).toBe(expected);
	});

	it('should handle multiple numbered parts in path', () => {
		const input = '[Guide](2_folder/3_subfolder/1_file.md)';
		const expected = '[Guide](folder/subfolder/file.md)';
		expect(rewriteNumberedFileLinks(input)).toBe(expected);
	});

	it('should not modify non-numbered prefixes', () => {
		const input = '[Guide](user_guide.md)';
		expect(rewriteNumberedFileLinks(input)).toBe(input);
	});

	it('should not modify paths with non-integer prefixes', () => {
		const input = '[Version](1a_version.md)';
		expect(rewriteNumberedFileLinks(input)).toBe(input);
	});

	it('should skip HTTP links', () => {
		const input = '[External](https://example.com/1_page)';
		expect(rewriteNumberedFileLinks(input)).toBe(input);
	});

	it('should handle special case paths with CODE_OF_CONDUCT', () => {
		const input = '[Code of Conduct](../../CODE_OF_CONDUCT.md)';
		const expected = '[Code of Conduct](../CODE_OF_CONDUCT.md)';
		expect(rewriteNumberedFileLinks(input)).toBe(expected);
	});
});

describe('rewriteReadmeFileLinks', () => {
	it('should rewrite README.md links to directory links', () => {
		const input = '[Documentation](docs/README.md)';
		const expected = '[Documentation](docs/)';
		expect(rewriteReadmeFileLinks(input)).toBe(expected);
	});

	it('should handle case-insensitive README', () => {
		const input = '[Guide](guide/readme.md)';
		const expected = '[Guide](guide/)';
		expect(rewriteReadmeFileLinks(input)).toBe(expected);
	});

	it('should preserve fragments', () => {
		const input = '[Setup](setup/README.md#installation)';
		const expected = '[Setup](setup/#installation)';
		expect(rewriteReadmeFileLinks(input)).toBe(expected);
	});

	it('should handle root README links', () => {
		const input = '[Main](README.md)';
		const expected = '[Main](./)';
		expect(rewriteReadmeFileLinks(input)).toBe(expected);
	});

	it('should handle current directory README links', () => {
		const input = '[Current](./README.md#section)';
		const expected = '[Current](./#section)';
		expect(rewriteReadmeFileLinks(input)).toBe(expected);
	});
});

describe('rewriteFileLinksAsLowerCase', () => {
	it('should convert file paths to lowercase', () => {
		const input = '[User Guide](User-Guide.md)';
		const expected = '[User Guide](user-guide)';
		expect(rewriteFileLinksAsLowerCase(input)).toBe(expected);
	});

	it('should preserve link text case', () => {
		const input = '[API Reference](API-Reference.md)';
		const expected = '[API Reference](api-reference)';
		expect(rewriteFileLinksAsLowerCase(input)).toBe(expected);
	});

	it('should preserve fragments', () => {
		const input = '[Config](Config.md#Advanced-Settings)';
		const expected = '[Config](config#Advanced-Settings)';
		expect(rewriteFileLinksAsLowerCase(input)).toBe(expected);
	});

	it('should handle mixed case paths', () => {
		const input = '[Tutorial](Tutorials/Getting-Started.md)';
		const expected = '[Tutorial](tutorials/getting-started)';
		expect(rewriteFileLinksAsLowerCase(input)).toBe(expected);
	});
});

describe('majmin', () => {
	it('should extract major.minor version from semantic version', () => {
		expect(majmin('v1.2.3')).toBe('v1.2');
		expect(majmin('v0.54.1')).toBe('v0.54');
		expect(majmin('v2.0.0')).toBe('v2.0');
	});

	it('should return unchanged if format does not match', () => {
		expect(majmin('v1.2')).toBe('v1.2');
		expect(majmin('1.2.3')).toBe('1.2.3');
		expect(majmin('invalid')).toBe('invalid');
	});
});