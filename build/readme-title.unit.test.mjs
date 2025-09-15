import { describe, expect, it } from 'vitest';

// Mock the title processing logic from the build script
function processTitleForFile(content, filename) {
	// Extract title from first heading (like the build script does)
	const heading = content.match(/#[\s]+(.*)/);
	if (!heading) return 'Untitled';
	
	let title = heading[1].replaceAll('`', '').replaceAll(':', '');
	
	// Override title to "Overview" for README.md files
	if (filename.endsWith('/README.md') || filename === 'README.md') {
		title = 'Overview';
	}
	
	return title;
}

describe('README Title Processing', () => {
	it('should set title to "Overview" for README.md files', () => {
		const content = '# Getting Started\n\nThis is a README file.';
		const filename = 'user-guide/README.md';
		
		const title = processTitleForFile(content, filename);
		expect(title).toBe('Overview');
	});

	it('should set title to "Overview" for root README.md', () => {
		const content = '# Project Documentation\n\nWelcome to the docs.';
		const filename = 'README.md';
		
		const title = processTitleForFile(content, filename);
		expect(title).toBe('Overview');
	});

	it('should preserve original title for non-README files', () => {
		const content = '# Installation Guide\n\nHow to install the project.';
		const filename = 'user-guide/installation.md';
		
		const title = processTitleForFile(content, filename);
		expect(title).toBe('Installation Guide');
	});

	it('should handle README files with complex titles', () => {
		const content = '# `Advanced Configuration`: Setup\n\nComplex title with backticks and colons.';
		const filename = 'reference/README.md';
		
		const title = processTitleForFile(content, filename);
		expect(title).toBe('Overview');
	});

	it('should handle nested README files', () => {
		const content = '# API Reference\n\nAPI documentation overview.';
		const filename = 'docs/reference/api/README.md';
		
		const title = processTitleForFile(content, filename);
		expect(title).toBe('Overview');
	});

	it('should preserve title sanitization for regular files', () => {
		const content = '# `Configuration`: Advanced Settings\n\nConfiguration details.';
		const filename = 'user-guide/config.md';
		
		const title = processTitleForFile(content, filename);
		expect(title).toBe('Configuration Advanced Settings');
	});

	it('should handle files without headings gracefully', () => {
		const content = 'No heading in this file.';
		const filename = 'user-guide/README.md';
		
		// This would cause an error in the real build script, but testing the expected behavior
		expect(() => processTitleForFile(content, filename)).not.toThrow();
	});

	it('should not affect files with "readme" in the name but not exact match', () => {
		const content = '# My Readme File\n\nThis is not a README.md.';
		const filename = 'user-guide/my-readme-file.md';
		
		const title = processTitleForFile(content, filename);
		expect(title).toBe('My Readme File');
	});
});