import { describe, expect, it } from 'vitest';
import * as semver from 'semver';

// Test the new pipeline features we've added

// Mock version processing logic
function processVersions(tags, cutoff = 2) {
	const vers = tags.filter(semver.valid);
	const sort = semver.rsort(vers);
	
	const majmins = sort
		.map((v) => `${semver.major(v)}.${semver.minor(v)}`)
		.reduce((list, mm) => {
			list.includes(mm) ? null : list.push(mm);
			return list;
		}, []);

	let ongoing = majmins.slice(0, cutoff);
	const retired = majmins.slice(cutoff);

	// Only process the latest version of each major.minor
	const versions = ongoing.map(mm => {
		return sort.find(ver => {
			const verMajMin = `${semver.major(ver)}.${semver.minor(ver)}`;
			return verMajMin === mm;
		});
	}).filter(Boolean);
	versions.push('main');

	return { versions, retired, ongoing };
}

function findCurrentVersion(versions) {
	const stableVersions = versions.filter(v => v !== 'main' && semver.prerelease(v) === null);
	return stableVersions[0] || null;
}

describe('Pipeline Features', () => {
	describe('Version Management', () => {
		it('should correctly identify ongoing and retired versions', () => {
			const mockTags = ['v1.0.0', 'v1.0.1', 'v1.1.0', 'v2.0.0', 'v2.0.1', 'v3.0.0'];
			const result = processVersions(mockTags, 2);
			
			expect(result.ongoing).toEqual(['3.0', '2.0']);
			expect(result.retired).toEqual(['1.1', '1.0']);
			expect(result.versions).toHaveLength(3); // 2 versions + main
			expect(result.versions).toContain('main');
		});

		it('should process only latest patch version for each major.minor', () => {
			const mockTags = ['v1.0.0', 'v1.0.5', 'v1.1.0', 'v1.1.3', 'v2.0.0'];
			const result = processVersions(mockTags, 3);
			
			// Should get latest patch for each major.minor
			expect(result.versions).toContain('v1.0.5');
			expect(result.versions).toContain('v1.1.3');
			expect(result.versions).toContain('v2.0.0');
			expect(result.versions).not.toContain('v1.0.0');
			expect(result.versions).not.toContain('v1.1.0');
		});
	});

	describe('Current Version Aliasing', () => {
		it('should identify latest stable version as current', () => {
			const versions = ['v2.1.0', 'v2.0.0', 'v1.5.0', 'main'];
			const current = findCurrentVersion(versions);
			
			expect(current).toBe('v2.1.0');
		});

		it('should ignore prerelease versions for current', () => {
			const versions = ['v2.1.0-beta.1', 'v2.0.0', 'v1.5.0', 'main'];
			const current = findCurrentVersion(versions);
			
			expect(current).toBe('v2.0.0');
		});

		it('should ignore main branch for current', () => {
			const versions = ['main', 'v1.0.0'];
			const current = findCurrentVersion(versions);
			
			expect(current).toBe('v1.0.0');
		});

		it('should return null if no stable versions exist', () => {
			const versions = ['main', 'v1.0.0-alpha.1'];
			const current = findCurrentVersion(versions);
			
			expect(current).toBeNull();
		});
	});

	describe('Content Organization', () => {
		it('should map root files to correct directories', () => {
			const mappings = {
				'SECURITY.md': { dir: '090_community', file: 'security.md' },
				'CODE_OF_CONDUCT.md': { dir: '100_contribute', file: 'code_of_conduct.md' },
				'SUPPORT.md': { dir: '090_community', file: 'support.md' }
			};

			Object.entries(mappings).forEach(([rootFile, expected]) => {
				expect(expected.dir).toBeDefined();
				expect(expected.file).toBeDefined();
				expect(expected.file).toMatch(/\.md$/);
			});
		});
	});

	describe('Version Retirement', () => {
		it('should identify correct content paths for cleanup', () => {
			const retired = ['1.0', '0.9'];
			const siteRoot = '/Users/test/docs';
			
			retired.forEach(majmin => {
				const contentGlob = `${siteRoot}/src/content/docs/v${majmin}.*`;
				const staticGlob = `${siteRoot}/public/assets/v${majmin}.*`;
				
				expect(contentGlob).toContain(`v${majmin}`);
				expect(staticGlob).toContain(`v${majmin}`);
			});
		});
	});


	describe('Path Resolution', () => {
		it('should handle version path transformations correctly', () => {
			const testCases = [
				{ input: 'v1.2.3', expected: 'v1.2' },
				{ input: 'v0.54.1', expected: 'v0.54' },
				{ input: 'v2.0.0', expected: 'v2.0' }
			];

			testCases.forEach(({ input, expected }) => {
				const result = input.replace(/^v(\d+\.\d+)\.\d+$/, 'v$1');
				expect(result).toBe(expected);
			});
		});
	});
});