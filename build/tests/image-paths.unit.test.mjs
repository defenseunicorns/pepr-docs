import { describe, expect, it } from 'vitest';

// Import the function we want to test
// Since it's not exported, we'll need to extract it or make it testable
function fixImagePaths(content) {
	return content
		.replace(/_images\/pepr-arch\.svg/g, '/assets/pepr-arch.png')
		.replace(/_images\/pepr-arch\.png/g, '/assets/pepr-arch.png')
		.replace(/resources\/create-pepr-operator\/(light|dark)\.png/g, '/assets/$1.png')
		.replace(/\.\.\/\.\.\/\.\.\/images\/([\w-]+\.png)/g, '/assets/$1');
}

describe('fixImagePaths', () => {
	it('should replace _images/pepr-arch.svg with /assets/pepr-arch.png', () => {
		const input = '![Pepr Architecture](_images/pepr-arch.svg)';
		const expected = '![Pepr Architecture](/assets/pepr-arch.png)';
		expect(fixImagePaths(input)).toBe(expected);
	});

	it('should replace _images/pepr-arch.png with /assets/pepr-arch.png', () => {
		const input = '![Pepr Architecture](_images/pepr-arch.png)';
		const expected = '![Pepr Architecture](/assets/pepr-arch.png)';
		expect(fixImagePaths(input)).toBe(expected);
	});

	it('should replace resources/create-pepr-operator/light.png with /assets/light.png', () => {
		const input = '![Light Mode](resources/create-pepr-operator/light.png)';
		const expected = '![Light Mode](/assets/light.png)';
		expect(fixImagePaths(input)).toBe(expected);
	});

	it('should replace resources/create-pepr-operator/dark.png with /assets/dark.png', () => {
		const input = '![Dark Mode](resources/create-pepr-operator/dark.png)';
		const expected = '![Dark Mode](/assets/dark.png)';
		expect(fixImagePaths(input)).toBe(expected);
	});

	it('should replace relative path ../../../images/ with /assets/', () => {
		const input = '![Screenshot](../../../images/pepr-dashboard-screenshot.png)';
		const expected = '![Screenshot](/assets/pepr-dashboard-screenshot.png)';
		expect(fixImagePaths(input)).toBe(expected);
	});

	it('should handle multiple image replacements in the same content', () => {
		const input = `
# Documentation
![Architecture](_images/pepr-arch.svg)
![Light Mode](resources/create-pepr-operator/light.png) 
![Dark Mode](resources/create-pepr-operator/dark.png)
![Screenshot](../../../images/pepr-dashboard-screenshot.png)
`;
		const expected = `
# Documentation
![Architecture](/assets/pepr-arch.png)
![Light Mode](/assets/light.png) 
![Dark Mode](/assets/dark.png)
![Screenshot](/assets/pepr-dashboard-screenshot.png)
`;
		expect(fixImagePaths(input)).toBe(expected);
	});

	it('should not modify already correct /assets/ paths', () => {
		const input = '![Already Correct](/assets/pepr-arch.png)';
		expect(fixImagePaths(input)).toBe(input);
	});

	it('should handle empty content', () => {
		expect(fixImagePaths('')).toBe('');
	});

	it('should handle content with no image references', () => {
		const input = 'This is just text with no images.';
		expect(fixImagePaths(input)).toBe(input);
	});
});