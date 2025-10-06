import { describe, expect, it, beforeAll } from 'vitest';
import {
	discoverVersions,
	getStarlightVersions,
} from '../version-discovery.mjs';

describe('Version Discovery - Table Format', () => {
	let coreRepoPath;
	let discoverResult;
	let starlightResult;

	beforeAll(async () => {
		coreRepoPath = process.env.CORE || process.env.PEPR_CORE_PATH;
		if (coreRepoPath) {
			discoverResult = await discoverVersions(coreRepoPath, 2);
			starlightResult = await getStarlightVersions(coreRepoPath, 2);
		}
	});

	const discoverTestCases = [
		{
			name: 'should return versions and retired arrays',
			check: (result) => {
				expect(result).toHaveProperty('versions');
				expect(result).toHaveProperty('retired');
				expect(Array.isArray(result.versions)).toBe(true);
				expect(Array.isArray(result.retired)).toBe(true);
			},
		},
		{
			name: 'should include "latest" in versions',
			check: (result) => expect(result.versions).toContain('latest'),
		},
		{
			name: 'should respect cutoff parameter',
			check: (result) => {
				const versionCount = result.versions.filter(
					(v) => v !== 'latest'
				).length;
				expect(versionCount).toBeLessThanOrEqual(2);
			},
		},
		{
			name: 'should return major.minor format for retired versions',
			check: (result) =>
				result.retired.forEach((version) =>
					expect(version).toMatch(/^\d+\.\d+$/)
				),
		},
		{
			name: 'should return full semver for active versions',
			check: (result) => {
				const semverVersions = result.versions.filter((v) => v !== 'latest');
				semverVersions.forEach((version) =>
					expect(version).toMatch(/^v?\d+\.\d+\.\d+/)
				);
			},
		},
	];

	it.each(discoverTestCases)('discoverVersions - $name', async ({ check }) => {
		if (!coreRepoPath) {
			console.log('Skipping test: No CORE repository path provided');
			return;
		}
		check(discoverResult);
	});

	const starlightTestCases = [
		{
			name: 'should format versions with major.minor slugs',
			check: (result) =>
				result.forEach((v) => {
					expect(v).toHaveProperty('slug');
					expect(v).toHaveProperty('label');
					expect(v.slug).toMatch(/^v\d+\.\d+$/);
				}),
		},
		{
			name: 'should not include "latest" in starlight versions',
			check: (result) => {
				const hasLatest = result.some(
					(v) => v.slug === 'latest' || v.label === 'latest'
				);
				expect(hasLatest).toBe(false);
			},
		},
		{
			name: 'should use full version for label',
			check: (result) =>
				result.forEach((v) => expect(v.label).toMatch(/^v?\d+\.\d+\.\d+/)),
		},
		{
			name: 'should filter out prerelease versions',
			check: (result) =>
				result.forEach((v) => expect(v.label).not.toMatch(/-alpha|-beta|-rc/)),
		},
		{
			name: 'should return array of version objects',
			check: (result) => {
				expect(Array.isArray(result)).toBe(true);
				expect(result.length).toBeGreaterThan(0);
			},
		},
		{
			name: 'should maintain consistency between slug and label major.minor',
			check: (result) =>
				result.forEach((v) => {
					const slugMajMin = v.slug.match(/(\d+\.\d+)/)?.[1];
					const labelMajMin = v.label.match(/(\d+\.\d+)/)?.[1];
					expect(slugMajMin).toBe(labelMajMin);
				}),
		},
	];

	it.each(starlightTestCases)(
		'getStarlightVersions - $name',
		async ({ check }) => {
			if (!coreRepoPath) {
				console.log('Skipping test: No CORE repository path provided');
				return;
			}
			check(starlightResult);
		}
	);
});
