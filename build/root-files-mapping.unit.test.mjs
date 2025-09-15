import { describe, expect, it } from 'vitest';

// Mock the root file mapping logic from the build script
function mapRootFile(rootMdFile) {
	let rootMdDir, targetFileName;
	
	if (rootMdFile === 'SECURITY.md') {
		rootMdDir = '090_community';
		targetFileName = 'security.md';
	} else if (rootMdFile === 'CODE_OF_CONDUCT.md') {
		rootMdDir = '100_contribute';
		targetFileName = 'code_of_conduct.md';
	} else if (rootMdFile === 'SUPPORT.md') {
		rootMdDir = '090_community';
		targetFileName = 'support.md';
	}
	
	return { rootMdDir, targetFileName, indexFilePath: `${rootMdDir}/${targetFileName}` };
}

describe('Root Files Mapping', () => {
	it('should map SECURITY.md to community/security.md', () => {
		const result = mapRootFile('SECURITY.md');
		
		expect(result.rootMdDir).toBe('090_community');
		expect(result.targetFileName).toBe('security.md');
		expect(result.indexFilePath).toBe('090_community/security.md');
	});

	it('should map CODE_OF_CONDUCT.md to contribute/code_of_conduct.md', () => {
		const result = mapRootFile('CODE_OF_CONDUCT.md');
		
		expect(result.rootMdDir).toBe('100_contribute');
		expect(result.targetFileName).toBe('code_of_conduct.md');
		expect(result.indexFilePath).toBe('100_contribute/code_of_conduct.md');
	});

	it('should map SUPPORT.md to community/support.md', () => {
		const result = mapRootFile('SUPPORT.md');
		
		expect(result.rootMdDir).toBe('090_community');
		expect(result.targetFileName).toBe('support.md');
		expect(result.indexFilePath).toBe('090_community/support.md');
	});

	it('should handle unknown files gracefully', () => {
		const result = mapRootFile('UNKNOWN.md');
		
		expect(result.rootMdDir).toBeUndefined();
		expect(result.targetFileName).toBeUndefined();
		expect(result.indexFilePath).toBe('undefined/undefined');
	});

	it('should create unique paths for each root markdown file', () => {
		const security = mapRootFile('SECURITY.md');
		const conduct = mapRootFile('CODE_OF_CONDUCT.md');
		const support = mapRootFile('SUPPORT.md');
		
		// Files go to appropriate directories
		expect(security.rootMdDir).toBe('090_community');
		expect(conduct.rootMdDir).toBe('100_contribute');
		expect(support.rootMdDir).toBe('090_community');
		
		// Each has unique filename
		expect(security.targetFileName).toBe('security.md');
		expect(conduct.targetFileName).toBe('code_of_conduct.md');
		expect(support.targetFileName).toBe('support.md');
		
		// No conflicts in final paths
		const paths = [security.indexFilePath, conduct.indexFilePath, support.indexFilePath];
		const uniquePaths = [...new Set(paths)];
		expect(uniquePaths.length).toBe(3); // All paths should be unique
	});

	it('should maintain consistent naming convention', () => {
		const security = mapRootFile('SECURITY.md');
		const conduct = mapRootFile('CODE_OF_CONDUCT.md');
		const support = mapRootFile('SUPPORT.md');
		
		// All should be lowercase
		expect(security.targetFileName).toBe(security.targetFileName.toLowerCase());
		expect(conduct.targetFileName).toBe(conduct.targetFileName.toLowerCase());
		expect(support.targetFileName).toBe(support.targetFileName.toLowerCase());
		
		// All should end with .md
		expect(security.targetFileName).toMatch(/\.md$/);
		expect(conduct.targetFileName).toMatch(/\.md$/);
		expect(support.targetFileName).toMatch(/\.md$/);
	});
});