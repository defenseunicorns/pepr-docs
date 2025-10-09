import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateNetlifyRedirects } from '../redirects-generator.mjs';

describe('generateNetlifyRedirects', () => {
	let tempDir;
	let outputPath;
	let mockCoreRepo;

	beforeEach(async () => {
		// Create temporary directory for test outputs
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'redirects-test-'));
		outputPath = path.join(tempDir, '_redirects');

		// Create mock core repo with proper git initialization
		mockCoreRepo = path.join(tempDir, 'mock-core');
		await fs.mkdir(mockCoreRepo, { recursive: true });

		// Initialize git repo and create tags
		const { execFile } = await import('node:child_process');
		const { promisify } = await import('node:util');
		const exec = promisify(execFile);

		await exec('git', ['init'], { cwd: mockCoreRepo });
		await exec('git', ['config', 'user.email', 'test@example.com'], { cwd: mockCoreRepo });
		await exec('git', ['config', 'user.name', 'Test User'], { cwd: mockCoreRepo });

		// Create a dummy commit (required for tags)
		await fs.writeFile(path.join(mockCoreRepo, 'README.md'), '# Test');
		await exec('git', ['add', '.'], { cwd: mockCoreRepo });
		await exec('git', ['commit', '-m', 'Initial commit'], { cwd: mockCoreRepo });

		// Create test tags
		await exec('git', ['tag', 'v0.53.0'], { cwd: mockCoreRepo });
		await exec('git', ['tag', 'v0.53.1'], { cwd: mockCoreRepo });
		await exec('git', ['tag', 'v0.54.0'], { cwd: mockCoreRepo });
		await exec('git', ['tag', 'v0.54.1'], { cwd: mockCoreRepo });
		await exec('git', ['tag', 'v0.54.2'], { cwd: mockCoreRepo });
		await exec('git', ['tag', 'v0.55.0'], { cwd: mockCoreRepo });
		await exec('git', ['tag', 'v0.55.1-beta.1'], { cwd: mockCoreRepo });
	});

	afterEach(async () => {
		// Clean up temp directory
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it('should generate _redirects file', async () => {
		const results = await generateNetlifyRedirects({
			coreRepoPath: mockCoreRepo,
			retiredVersions: ['0.53', '0.52'],
			activeVersions: ['v0.54.0', 'v0.55.0'],
			outputPath,
		});

		const fileExists = await fs.stat(outputPath).then(() => true).catch(() => false);
		expect(fileExists).toBe(true);
	});

	it('should return redirect counts', async () => {
		const results = await generateNetlifyRedirects({
			coreRepoPath: mockCoreRepo,
			retiredVersions: ['0.53'],
			activeVersions: ['v0.54.0'],
			outputPath,
		});

		expect(results).toHaveProperty('totalRules');
		expect(results).toHaveProperty('retiredCount');
		expect(results).toHaveProperty('manualCount');
		expect(results).toHaveProperty('patchCount');
		expect(typeof results.totalRules).toBe('number');
	});

	it('should include section headers', async () => {
		await generateNetlifyRedirects({
			coreRepoPath: mockCoreRepo,
			retiredVersions: ['0.53'],
			activeVersions: ['v0.54.0'],
			outputPath,
		});

		const content = await fs.readFile(outputPath, 'utf8');
		expect(content).toContain('# Retired Version Redirects');
		expect(content).toContain('# Manual Redirects');
		expect(content).toContain('# Automatic Patch-to-Minor Redirects');
	});

	it('should generate retired version redirects', async () => {
		await generateNetlifyRedirects({
			coreRepoPath: mockCoreRepo,
			retiredVersions: ['0.53', '0.52'],
			activeVersions: [],
			outputPath,
		});

		const content = await fs.readFile(outputPath, 'utf8');
		expect(content).toContain('/v0.53/*  /:splat  301');
		expect(content).toContain('/v0.52/*  /:splat  301');
	});

	it('should include manual redirects', async () => {
		await generateNetlifyRedirects({
			coreRepoPath: mockCoreRepo,
			retiredVersions: [],
			activeVersions: [],
			outputPath,
		});

		const content = await fs.readFile(outputPath, 'utf8');
		// Check for some manual redirects (these are in MANUAL_REDIRECTS)
		expect(content).toContain('/main/*  /:splat  301');
		expect(content).toContain('/latest/*  /:splat  301');
	});

	it('should format patch-to-minor redirects correctly', async () => {
		await generateNetlifyRedirects({
			coreRepoPath: mockCoreRepo,
			retiredVersions: [],
			activeVersions: ['v0.54.0', 'v0.54.1'],
			outputPath,
		});

		const content = await fs.readFile(outputPath, 'utf8');
		// Each patch version should have exact and wildcard redirects
		expect(content).toContain('/v0.54.0  /v0.54  301');
		expect(content).toContain('/v0.54.0/*  /v0.54/:splat  301');
		expect(content).toContain('/v0.54.1  /v0.54  301');
		expect(content).toContain('/v0.54.1/*  /v0.54/:splat  301');
	});

	it('should handle multiple patch versions for same major.minor', async () => {
		const results = await generateNetlifyRedirects({
			coreRepoPath: mockCoreRepo,
			retiredVersions: [],
			activeVersions: ['v0.54.0', 'v0.54.1', 'v0.54.2'],
			outputPath,
		});

		const content = await fs.readFile(outputPath, 'utf8');
		expect(content).toContain('/v0.54.0  /v0.54  301');
		expect(content).toContain('/v0.54.0/*  /v0.54/:splat  301');
		expect(content).toContain('/v0.54.1  /v0.54  301');
		expect(content).toContain('/v0.54.1/*  /v0.54/:splat  301');
		expect(content).toContain('/v0.54.2  /v0.54  301');
		expect(content).toContain('/v0.54.2/*  /v0.54/:splat  301');
		// 2 rules per patch version (exact + wildcard)
		expect(results.patchCount).toBeGreaterThanOrEqual(6);
	});

	it('should add auto-generated warning comment', async () => {
		await generateNetlifyRedirects({
			coreRepoPath: mockCoreRepo,
			retiredVersions: [],
			activeVersions: [],
			outputPath,
		});

		const content = await fs.readFile(outputPath, 'utf8');
		expect(content).toContain('Auto-generated');
		expect(content).toContain('DO NOT EDIT MANUALLY');
	});

	it('should use proper Netlify redirect format', async () => {
		await generateNetlifyRedirects({
			coreRepoPath: mockCoreRepo,
			retiredVersions: ['0.53'],
			activeVersions: [],
			outputPath,
		});

		const content = await fs.readFile(outputPath, 'utf8');
		const lines = content.split('\n').filter(l => !l.startsWith('#') && l.trim());

		// All redirect lines should have format: source destination status
		for (const line of lines) {
			const parts = line.trim().split(/\s+/);
			if (parts.length > 0) {
				expect(parts).toHaveLength(3);
				expect(parts[2]).toBe('301');
			}
		}
	});

	it('should skip prerelease versions in patch redirects', async () => {
		await generateNetlifyRedirects({
			coreRepoPath: mockCoreRepo,
			retiredVersions: [],
			activeVersions: ['v0.54.0', 'v0.54.1-beta.1'],
			outputPath,
		});

		const content = await fs.readFile(outputPath, 'utf8');
		expect(content).toContain('/v0.54.0  /v0.54  301');
		expect(content).toContain('/v0.54.0/*  /v0.54/:splat  301');
		expect(content).not.toContain('v0.54.1-beta.1');
	});
});
