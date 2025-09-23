import { program } from 'commander';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as util from 'node:util';
import * as child_process from 'node:child_process';
import * as semver from 'semver';
import { glob } from 'glob';
import { heredoc } from './heredoc.mjs';
import { discoverVersions, findCurrentVersion } from './version-discovery.mjs';

const exec = util.promisify(child_process.exec);



program
	.version('0.0.0', '-v, --version')
	.requiredOption('-c, --core <path>', 'path to core project folder')
	.requiredOption('-s, --site <path>', 'path to docs site folder')
	.option('-n, --no-dist', 'do not generate /dist output')
	.parse();
const opts = program.opts();

const RUN = { cutoff: 2 }; // Global build state. cutoff: minimum versions to keep before retiring

// Error-handling wrapper that captures logs and provides structured error reporting
async function executeWithErrorHandling(label, func) {
	let log = [];
	let err = '';

	try {
		await func(log);
	} catch (e) {
		err = e;
	} finally {
		if (err) {
			['', err, '', 'State dump:', RUN].forEach((m) => console.error(m));
			program.error('');
		}
	}
}

// Check if a string starts with a numeric prefix (e.g., "010_filename")
function hasNumericPrefix(str) {
	return Number.isInteger(Number(str));
}

// Fix image paths in content
function fixImagePaths(content) {
	return content
		.replace(/_images\/pepr-arch\.svg/g, '/assets/pepr-arch.png')
		.replace(/_images\/pepr-arch\.png/g, '/assets/pepr-arch.png')
		.replace(/images\/pepr-arch\.png/g, '/assets/pepr-arch.png')
		.replace(/images\/pepr-arch\.svg/g, '/assets/pepr-arch.png')
		.replace(/_images\/pepr\.png/g, '/assets/pepr.png')
		.replace(/resources\/create-pepr-operator\/(light|dark)\.png/g, '/assets/$1.png')
		.replace(/\.\.\/\.\.\/\.\.\/images\/([\w-]+\.png)/g, '/assets/$1');
}

// Convert GitHub callouts to MDX admonitions
function convertCallouts(content, filePath) {
	return content.replace(
		/^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]\n((?:^>.*\n?)*)/gm,
		(match, type, calloutContent) => {
			const mdxType = type.toLowerCase();
			const cleanContent = calloutContent
				.split('\n')
				.map((line) => line.replace(/^> ?/, ''))
				.filter((line) => line.length > 0)
				.join('\n');
			console.log(
				`Converting ${type} callout in ${filePath}`
			);
			return `:::${mdxType}\n${cleanContent}\n:::`;
		}
	);
}

// Content transformation pipeline - all transformations in one place
const transformContent = (content) => {
	// 1. Fix image paths
	let result = fixImagePaths(content);

	// 2. Convert video links
	result = result.replaceAll(/https[\S]*.mp4/g, (url) => `<video class="td-content" controls src="${url}"></video>`);

	// 3. Process markdown links
	Array.from(result.matchAll(/\]\([^)]*\)/g), (m) => m[0]).forEach((mdLink) => {
		let parts = mdLink.replace('](', '').replace(')', '').split('/');
		if (parts[0].startsWith('http')) return;

		// Apply transformations
		if (parts[0] === '..' && parts[1] === '..' && ['CODE_OF_CONDUCT.md', 'SECURITY.md', 'SUPPORT.md'].includes(parts[2])) parts.shift();
		parts = parts.map(p => hasNumericPrefix(p.split('_')[0]) ? p.split('_').slice(1).join('_') : p);
		if (parts.at(-1) === 'README.md') parts.pop();
		if (parts[0]?.startsWith('_images')) parts[0] = '__images';

		result = result.replaceAll(mdLink, `](${parts.join('/').toLowerCase()})`);
	});

	// 4. Escape MDX content
	return result
		.replaceAll(/\*\*@param\b/g, '**\\@param')
		.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}')
		.replace(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g, '&lt;$1&gt;')
		.replace(/<([^>]*[@!][^>]*)>/g, '&lt;$1&gt;');
};

// Efficient content processing pipeline with parallel file processing
async function processAllContent(contentDir) {
	const contentFiles = await glob(`${contentDir}/**/*.md`);

	// Process files in parallel and collect results
	const results = await Promise.all(contentFiles.map(async (contentFile) => {
		const originalContent = await fs.readFile(contentFile, 'utf8');
		let processedContent = originalContent;
		let imagePathsFixed = false;
		let calloutsFixed = false;

		// Apply image path fixes
		const afterImageFix = fixImagePaths(processedContent);
		if (afterImageFix !== processedContent) {
			imagePathsFixed = true;
			processedContent = afterImageFix;
		}

		// Apply callout conversion
		const afterCalloutFix = convertCallouts(processedContent, contentFile);
		if (afterCalloutFix !== processedContent) {
			calloutsFixed = true;
			processedContent = afterCalloutFix;
		}

		// Write file only if changes were made
		if (originalContent !== processedContent) {
			await fs.writeFile(contentFile, processedContent);
			return { updated: true, imagePathsFixed, calloutsFixed };
		}

		return { updated: false, imagePathsFixed: false, calloutsFixed: false };
	}));

	// Aggregate results
	const updatedFilesCount = results.filter(r => r.updated).length;
	const imagePathsFixedCount = results.filter(r => r.imagePathsFixed).length;
	const calloutsFixedCount = results.filter(r => r.calloutsFixed).length;

	if (updatedFilesCount > 0) {
		console.log(`Updated ${updatedFilesCount} files`);
		if (imagePathsFixedCount > 0) {
			console.log(`Fixed image paths in ${imagePathsFixedCount} files`);
		}
		if (calloutsFixedCount > 0) {
			console.log(`Fixed callouts in ${calloutsFixedCount} files`);
		}
	}
}

const TOTAL = 'Total build time';
console.time(TOTAL);

await executeWithErrorHandling(`Validate args`, async (log) => {
	const dirOrDie = async (path) => {
		if (!(await fs.stat(path)).isDirectory()) {
			throw new Error(`Not a directory: '${path}'`);
		}
	};

	RUN.site = path.resolve(opts.site);
	await dirOrDie(RUN.site);

	RUN.core = path.resolve(opts.core);
	await dirOrDie(RUN.core);

	log.push(['site', RUN.site]);
	log.push(['core', RUN.core]);
});

// Ensure work directory is created relative to the docs directory, not wherever the script runs from
RUN.work = path.resolve(path.dirname(RUN.site), '../../work');

await executeWithErrorHandling(`Clean work dir`, async (log) => {
	await fs.rm(RUN.work, { recursive: true, force: true });
	await fs.mkdir(RUN.work);

	log.push(['work', RUN.work]);
});

await executeWithErrorHandling(`Copy site src to work dir`, async () => {
	await fs.cp(RUN.site, RUN.work, { recursive: true });
});

await executeWithErrorHandling(`Search core repo versions`, async (log) => {
	const { versions, retired } = await discoverVersions(RUN.core, RUN.cutoff);

	RUN.versions = versions;
	RUN.retired = retired;

	log.push(['versions', RUN.versions]);
	log.push(['retired', RUN.retired]);
});

await executeWithErrorHandling(`Nuke retired version content`, async (log) => {
	for (const majmin of RUN.retired) {
		// Clean up Starlight content directories
		const contentGlob = `${RUN.site}/src/content/docs/v${majmin}.*`;
		// Clean up static assets if they exist
		const staticGlob = `${RUN.site}/public/assets/v${majmin}.*`;

		const contentDirs = await glob(contentGlob);
		const staticDirs = await glob(staticGlob);

		for (const dirPath of contentDirs) {
			await fs.rm(dirPath, { recursive: true, force: true });
			log.push(['content', `removed v${majmin} content: ${dirPath}`]);
		}

		for (const dirPath of staticDirs) {
			await fs.rm(dirPath, { recursive: true, force: true });
			log.push(['static', `removed v${majmin} assets: ${dirPath}`]);
		}
	}
});

// Check if version should be skipped (already built). Always rebuilds 'latest' to ensure freshness
async function shouldSkipVersion(version, verdir) {
	const found = await fs.stat(verdir).then(s => s.isDirectory()).catch(() => false);

	// Always rebuild latest/main
	if (found && version === 'latest') {
		await fs.rm(verdir, { recursive: true, force: true });
		return false;
	}

	return found;
}

// Create version directory
const createVersionDirectory = (verdir) =>
	executeWithErrorHandling(`Create version dir`, async (log) => {
		await fs.mkdir(verdir, { recursive: true });
		log.push(['dir', verdir]);
	});

// Checkout the appropriate git version
async function checkoutCoreVersion(core, version) {
	await executeWithErrorHandling(`Checkout core version`, async (log) => {
		const checkoutTarget = version === 'latest' ? 'main' : version;
		await exec(`
			cd ${core}
			git checkout ${checkoutTarget}
		`);

		let result = version === 'latest'
			? await exec(`cd ${core} ; git branch --show-current`)
			: await exec(`cd ${core} ; git describe --tags`);

		result = result.stdout.trim();

		log.push(['repo', core]);
		version === 'latest'
			? log.push(['branch', result])
			: log.push(['tag', result]);
	});
}

// Find and filter source documentation files
async function findSourceDocFiles(coredocs) {
	let srcmds = [];

	await executeWithErrorHandling(`Find source doc files`, async (log) => {
		let sources = await fs.readdir(coredocs, { recursive: true });

		// Process only .md files, but not non-root README.md
		srcmds = sources
			.filter((f) => f.endsWith('.md'))
			.filter((f) => !(f === 'README.md'));

		const srcign = sources.filter((s) => !srcmds.includes(s));

		log.push(['sources', srcmds]);
		log.push(['ignored', srcign]);
	});

	return srcmds;
}

// Copy repository images
const copyRepoImages = (core, work, version) =>
	executeWithErrorHandling(`Copy repo images`, async (log) => {
		const [src, dst] = [`${core}/_images`, `${work}/static/${version}/_images`];
		await fs.cp(src, dst, { recursive: true });
		log.push(['src', src], ['dst', dst]);
	});

// Copy repository resources
async function copyRepoResources(core, work, version) {
	await executeWithErrorHandling(`Copy repo resources`, async (log) => {
		const srcresources = `${core}/docs`;
		const dstresources = `${work}/static/${version}`;

		// Copy all resource directories from docs
		const resourceDirs = await glob(`${srcresources}/**/resources`, {
			onlyDirectories: true,
		});

		for (const resourceDir of resourceDirs) {
			const relativePath = path.relative(srcresources, resourceDir);
			const dstPath = path.join(dstresources, relativePath);
			await fs.mkdir(path.dirname(dstPath), { recursive: true });
			await fs.cp(resourceDir, dstPath, { recursive: true });
			log.push(['copied', `${resourceDir} -> ${dstPath}`]);
		}
	});
}

// Map community files from repository root to their destination paths in docs
const ROOT_MD_MAPPINGS = {
	'SECURITY.md': '090_community/security.md',
	'CODE_OF_CONDUCT.md': '100_contribute/code_of_conduct.md',
	'CODE-OF-CONDUCT.md': '100_contribute/code_of_conduct.md',
	'SUPPORT.md': '090_community/support.md'
};

// Process root level markdown files (community files)
const processRootMarkdownFiles = async (core, version) => {
	const processedFiles = [];

	await executeWithErrorHandling('Process root level markdown files', async () => {
		for (const [srcFile, targetPath] of Object.entries(ROOT_MD_MAPPINGS)) {
			const srcPath = `${core}/${srcFile}`;
			if (await fs.stat(srcPath).then(() => true).catch(() => false)) {
				console.log(`Found ${srcFile} for version ${version}`);
				await fs.mkdir(path.dirname(targetPath), { recursive: true });
				await fs.copyFile(srcPath, targetPath);
				processedFiles.push(targetPath);
			} else {
				console.log(`${srcFile} does not exist for version ${version}.`);
			}
		}
	});

	return processedFiles;
};

// Determine source path for a file (handles special community files)
const getSourcePath = (file, coredocs) =>
	['910_security/README.md', '900_code_of_conduct/README.md', '920_support/README.md',
	 '090_community/security.md', '100_contribute/code_of_conduct.md', '090_community/support.md']
		.some(cf => file.endsWith(cf)) ? file : `${coredocs}/${file}`;

// Directory restructuring rules for organizing content into logical sections
const PATH_MAPPINGS = {
	structure: { 'pepr-tutorials': 'tutorials', 'user-guide/actions': 'actions' },
	singleFile: { 'best-practices': 'reference/best-practices.md', 'module-examples': 'reference/module-examples.md', faq: 'reference/faq.md', roadmap: 'roadmap.md' }
};

const removeNumberPrefixes = (parts) => parts.map(p => hasNumericPrefix(p.split('_')[0]) ? p.split('_').slice(1).join('_') : p).join('/');

// Generate new file path for a source file
const generateFileMetadata = (file) => {
	const [dir, filename] = [path.dirname(file), path.basename(file)];
	const parts = dir.split('/');
	const parent = parts.pop();
	const ancestors = removeNumberPrefixes(parts);

	let rawdir = ancestors ? `${ancestors}/${parent.replace(/^\d+_/, '')}` : parent.replace(/^\d+_/, '');

	// Apply structure mappings
	let newdir = Object.entries(PATH_MAPPINGS.structure).reduce((dir, [old, new_]) =>
		dir.startsWith(old) ? dir.replace(old, new_) : dir, rawdir);

	// Process filename
	let newfile = filename.replace(/^\d+_/, '') === 'README.md' ? 'index.md' : filename.replace(/^\d+_/, '');

	// Handle single file mappings
	if (newfile === 'index.md' && PATH_MAPPINGS.singleFile[rawdir]) {
		[newdir, newfile] = ['', PATH_MAPPINGS.singleFile[rawdir]];
	}

	return { newfile: newdir && newdir !== '.' ? `${newdir}/${newfile}` : newfile };
};

// Generate Starlight front matter for a file
const generateFrontMatter = (content, newfile, version) => {
	const heading = content.match(/#[\s]+(.*)/);
	const title = (newfile.endsWith('/README.md') || newfile === 'README.md')
		? 'Overview'
		: heading[1].replaceAll(/[`:]/g, '');

	const slug = version !== 'latest'
		? `\nslug: ${version.replace(/^v(\d+\.\d+)\.\d+$/, 'v$1')}${newfile.replace(/\.md$/, '').replace(/\/index$/, '').replace(/^\/+|\/+$/g, '') ? `/${newfile.replace(/\.md$/, '').replace(/\/index$/, '').replace(/^\/+|\/+$/g, '')}` : ''}`
		: '';

	return {
		front: `---\ntitle: ${title}\ndescription: ${title}${slug}\n---`,
		contentWithoutHeading: content.replaceAll(heading[0], '')
	};
};

// Content link transformations
const LINK_MAPPINGS = {
	'](/pepr-tutorials/': '](/tutorials/',
	'](/best-practices/': '](/reference/best-practices/',
	'](/module-examples/': '](/reference/module-examples/',
	'](/faq/': '](/reference/faq/',
	'](/user-guide/actions/': '](/actions/'
};

// Apply content transformations and link fixes
const processContentLinks = (content, file) => {
	let result = transformContent(content);

	// Adjust relative links for non-README files
	if (path.basename(file) !== 'README.md') {
		result = result.replaceAll('](../', '](../../').replaceAll('](./', '](../');
	}

	// Apply all link mappings and cleanup
	return Object.entries(LINK_MAPPINGS)
		.reduce((acc, [old, new_]) => acc.replaceAll(old, new_), result)
		.replaceAll('.md)', '/)')
		.replaceAll(/.md#(.*)\)/g, (_, group) => `#${group})`);
};

// Process a single source file
const processSingleSourceFile = async (file, coredocs, verdir) => {
	const src = getSourcePath(file, coredocs);
	const content = await fs.readFile(src, 'utf8');
	const { newfile } = generateFileMetadata(file);
	const { front, contentWithoutHeading } = generateFrontMatter(content, newfile, RUN.version);
	const processedContent = processContentLinks([front, contentWithoutHeading].join('\n'), file);

	await fs.mkdir(`${verdir}/${path.dirname(newfile)}`, { recursive: true });
	await fs.writeFile(`${verdir}/${newfile}`, processedContent, 'utf8');
};

// Write version layout and landing content
const writeVersionLandingPage = async (version, verdir, core) => {
	await executeWithErrorHandling(`Write version layout & landing content`, async (log) => {
		const idxMd = `${verdir}/index.md`;
		const slugField = version !== 'latest'
			? `slug: ${version.replace(/^v(\d+\.\d+)\.\d+$/, 'v$1')}`
			: '';

		const idxFront = heredoc`
			---
			title: Pepr
			description: Pepr Documentation - ${version}${slugField ? `\n			${slugField}` : ''}
			---
		`;

		let idxBody = await fs.readFile(`${core}/README.md`, 'utf8');
		const headings = idxBody.match(/#[\s]+(.*)/);
		idxBody = idxBody
			.replaceAll(headings[0], '')
			.replaceAll('](./docs/', '](./');

		idxBody = transformContent(idxBody).replaceAll('.md)', '/');

		await fs.writeFile(idxMd, [idxFront, idxBody].join('\n'), 'utf8');
		log.push(['dst', idxMd]);
	});
};

// Process each version
for (const version of RUN.versions) {
	RUN.version = version;
	RUN.verdir = `${RUN.work}/content/${RUN.version}`;
	RUN.coredocs = `${RUN.core}/docs`;

	// Check if version should be skipped
	if (await shouldSkipVersion(RUN.version, RUN.verdir)) {
		console.log(`Skipping ${RUN.version} - already built`);
		continue;
	}

	console.log(`Processing version ${RUN.version}...`);

	// Set up version infrastructure
	await createVersionDirectory(RUN.verdir);
	await checkoutCoreVersion(RUN.core, RUN.version);
	RUN.srcmds = await findSourceDocFiles(RUN.coredocs);
	await copyRepoImages(RUN.core, RUN.work, RUN.version);
	await copyRepoResources(RUN.core, RUN.work, RUN.version);

	// Process root markdown files and add them to source files list
	const rootMarkdownFiles = await processRootMarkdownFiles(RUN.core, RUN.version);
	if (!RUN.srcmds) RUN.srcmds = [];
	if (rootMarkdownFiles && Array.isArray(rootMarkdownFiles)) {
		RUN.srcmds.push(...rootMarkdownFiles);
	}

	// Process all source files in parallel
	await Promise.all(RUN.srcmds.map(srcmd =>
		processSingleSourceFile(srcmd, RUN.coredocs, RUN.verdir)
	));

	// Write version landing page
	await writeVersionLandingPage(RUN.version, RUN.verdir, RUN.core);
}

await executeWithErrorHandling(`Process all work directory content`, async (log) => {
	// Process all content in work directory to fix image paths and callouts
	console.log('Processing work directory content (fixing image paths and callouts)...');
	const workContentDirs = await glob(`${RUN.work}/content/*`, { onlyDirectories: true });

	// Process all version directories in parallel
	await Promise.all(workContentDirs.map(async (workDir) => {
		const version = path.basename(workDir);
		console.log(`Processing work content for version: ${version}`);
		await processAllContent(workDir);
	}));

	log.push(['processed', workContentDirs.length + ' version directories']);
});

await executeWithErrorHandling(`Set current version alias`, async (log) => {
	// Find the latest stable version using the shared utility
	const currentVersion = findCurrentVersion(RUN.versions);
	if (!currentVersion) {
		log.push(['current', 'no stable versions found']);
		return;
	}

	const currentMajMin = currentVersion.replace(/^v(\d+\.\d+)\.\d+$/, 'v$1');

	// Create a "current" symlink/copy pointing to the latest stable version
	const currentDir = `${RUN.site}/src/content/docs/current`;
	const targetDir = `${RUN.site}/src/content/docs/v${currentMajMin}`;

	// Remove existing current directory if it exists
	try {
		await fs.rm(currentDir, { recursive: true, force: true });
	} catch (e) {
		// Directory might not exist, that's fine
	}

	// Check if target version directory exists
	if (
		await fs
			.stat(targetDir)
			.then(() => true)
			.catch(() => false)
	) {
		// Copy the content instead of symlink for better compatibility
		await fs.cp(targetDir, currentDir, { recursive: true });
		log.push(['current', `v${currentMajMin} (${currentVersion})`]);
		log.push(['target', targetDir]);
		log.push(['alias', currentDir]);
	} else {
		log.push(['error', `target version directory not found: ${targetDir}`]);
	}
});

// Auto-generate version JSON config files for starlight-versions (moved outside dist check)
await executeWithErrorHandling(`Generate version configuration files`, async (log) => {
	console.log('Auto-generating version configuration files...');
	const stableVersions = RUN.versions.filter(
		(v) => v !== 'latest' && semver.prerelease(v) === null
	);

	const versionConfigTemplate = {
		sidebar: [
			{
				label: 'User Guide',
				autogenerate: {
					directory: 'user-guide',
				},
			},
			{
				label: 'Actions',
				autogenerate: {
					directory: 'actions',
				},
			},
			{
				label: 'Tutorials',
				autogenerate: {
					directory: 'tutorials',
				},
			},
			{
				label: 'Reference',
				autogenerate: {
					directory: 'reference',
				},
			},
			{
				label: 'Community and Support',
				autogenerate: {
					directory: 'community',
				},
			},
			{
				label: 'Contribute',
				autogenerate: {
					directory: 'contribute',
				},
			},
			{
				label: 'Roadmap for Pepr',
				slug: 'roadmap',
			},
		],
	};

	// Get the site root directory (3 levels up from RUN.site which is src/content/docs)
	const siteRoot = path.dirname(path.dirname(path.dirname(RUN.site)));
	const versionsDir = `${siteRoot}/src/content/versions`;

	// Clear existing version configs
	await fs.rm(versionsDir, { recursive: true, force: true });
	await fs.mkdir(versionsDir, { recursive: true });

	// Generate JSON config only for versions that actually have content
	for (const version of stableVersions) {
		const versionMajMin = version.replace(/^v(\d+\.\d+)\.\d+$/, 'v$1');
		const versionContentPath = `${RUN.work}/content/${version}`;

		// Only create config if content directory exists and has files
		const contentExists = await fs
			.stat(versionContentPath)
			.then(async () => {
				const files = await fs.readdir(versionContentPath, { recursive: true });
				return files.some((f) => f.endsWith('.md'));
			})
			.catch(() => false);

		if (contentExists) {
			const configPath = `${versionsDir}/${versionMajMin}.json`;
			await fs.writeFile(
				configPath,
				JSON.stringify(versionConfigTemplate, null, 2)
			);
			log.push(['generated', `${versionMajMin}.json`]);
		} else {
			log.push(['skipped', `${versionMajMin} (no content)`]);
		}
	}
});

if (opts.dist) {
	await executeWithErrorHandling(`Clean dist dir`, async (log) => {
		RUN.dist = path.resolve(`./dist`);
		await fs.rm(RUN.dist, { recursive: true, force: true });
		await fs.mkdir(RUN.dist);

		log.push(['dist', RUN.dist]);
	});

	await executeWithErrorHandling(`Build Starlight site into dist dir`, async () => {
		// Copy content to Starlight content directories
		// RUN.site is ./src/content/docs, we need to go up 3 levels to get to the project root
		const siteRoot = path.dirname(path.dirname(path.dirname(RUN.site)));
		const starlightContentDir = `${siteRoot}/src/content/docs`;
		const publicDir = `${siteRoot}/public`;

		// Clear existing content directory
		await fs.rm(starlightContentDir, { recursive: true, force: true });
		await fs.mkdir(starlightContentDir, { recursive: true });

		// Copy images from work/static to public directory for Starlight
		console.log(
			'Copying images and resources to src and public directories...'
		);

		// Check what static directories exist
		const staticDirs = await fs.readdir(`${RUN.work}/static`).catch(() => []);
		console.log('Available static directories:', staticDirs);

		// Clean existing directories (only need resources since we use assets for images)
		await fs.rm(`${siteRoot}/src/content/docs/resources`, {
			recursive: true,
			force: true,
		});

		// Ensure assets directory exists
		await fs.mkdir(`${publicDir}/assets`, { recursive: true });

		// Try to copy images and resources from any available version (fallback strategy)
		// This ensures assets are available even if the primary version lacks them
		let resourcesCopied = false;
		for (const version of RUN.versions) {
			const staticVersionPath = `${RUN.work}/static/${version}`;
			const imagesPath = `${staticVersionPath}/_images`;
			const resourcesPath = `${staticVersionPath}/040_pepr-tutorials/resources`;

			if (
				await fs
					.stat(imagesPath)
					.then(() => true)
					.catch(() => false)
			) {
				console.log(`Copying images from ${imagesPath} to assets directory`);
				// Copy all images directly to assets directory
				const imageFiles = await fs.readdir(imagesPath);
				for (const imageFile of imageFiles) {
					const srcFile = path.join(imagesPath, imageFile);
					const destFile = path.join(`${publicDir}/assets`, imageFile);
					await fs.cp(srcFile, destFile);
				}
				resourcesCopied = true;
			}

			if (
				await fs
					.stat(resourcesPath)
					.then(() => true)
					.catch(() => false)
			) {
				console.log(
					`Copying resources from ${resourcesPath} to src directories`
				);
				await fs.mkdir(`${siteRoot}/src/content/docs/resources`, {
					recursive: true,
				});

				// Copy each subdirectory but flatten the numbered prefix
				const resourceSubdirs = await fs.readdir(resourcesPath, {
					withFileTypes: true,
				});
				for (const dirent of resourceSubdirs) {
					if (dirent.isDirectory()) {
						const srcDir = path.join(resourcesPath, dirent.name);
						// Remove numbered prefix (e.g., "030_create-pepr-operator" -> "create-pepr-operator")
						const cleanName = dirent.name.replace(/^\d+_/, '');
						const dstDir = path.join(
							`${siteRoot}/src/content/docs/resources`,
							cleanName
						);
						await fs.cp(srcDir, dstDir, { recursive: true });
						console.log(`Copied ${srcDir} -> ${dstDir}`);
					}
				}
				resourcesCopied = true;
			}

			if (resourcesCopied) break;
		}

		if (!resourcesCopied) {
			console.log('Warning: No images or resources found to copy');
		}

		// Copy main version content to unversioned location (current/latest)
		if (
			await fs
				.stat(`${RUN.work}/content/latest`)
				.then(() => true)
				.catch(() => false)
		) {
			await fs.cp(`${RUN.work}/content/latest`, starlightContentDir, {
				recursive: true,
			});
		}
		// Copy resource images to assets directory
		const resourceImages = await glob(
			`${siteRoot}/src/content/docs/resources/**/*.png`
		);
		if (resourceImages.length > 0) {
			console.log(
				`Copying ${resourceImages.length} resource images to assets directory...`
			);
			for (const resourceImage of resourceImages) {
				const imageName = path.basename(resourceImage);
				const destPath = `${publicDir}/assets/${imageName}`;
				await fs.cp(resourceImage, destPath);
			}
		}

		console.log(
			`Processing discovered stable versions: ${RUN.versions
				.filter((v) => v !== 'latest' && semver.prerelease(v) === null)
				.join(', ')}`
		);

		for (const version of RUN.versions.filter(
			(v) => v !== 'latest' && semver.prerelease(v) === null
		)) {
			const versionContentPath = `${RUN.work}/content/${version}`;
			const versionMajMin = version.replace(/^v(\d+\.\d+)\.\d+$/, 'v$1');
			const starlightVersionDir = `${siteRoot}/src/content/docs/${versionMajMin}`;

			if (
				await fs
					.stat(versionContentPath)
					.then(() => true)
					.catch(() => false)
			) {
				console.log(
					`Processing version ${version} - ensuring atomic operations...`
				);
				await fs.mkdir(starlightVersionDir, { recursive: true });
				await fs.cp(versionContentPath, starlightVersionDir, {
					recursive: true,
				});

				// Small delay to ensure file system operations complete
				await new Promise((resolve) => setTimeout(resolve, 100));



			}
		}

		// Execute Astro build and handle the complex copy sequence:
		// 1. Astro builds from src/content/docs to dist/
		// 2. We copy that to our target dist directory if different
		try {
			console.log(`Building Starlight site from directory: ${siteRoot}`);
			console.log(`Expected dist output: ${siteRoot}/dist`);

			// Execute build with better error handling
			const buildResult = await util.promisify(child_process.execFile)(
				'npm',
				['run', 'build'],
				{
					cwd: siteRoot,
					maxBuffer: 1024 * 1024 * 10, // 10MB buffer
				}
			);

			console.log('Build stdout:', buildResult.stdout);
			if (buildResult.stderr) {
				console.log('Build stderr:', buildResult.stderr);
			}

			// Check what's in siteRoot after building
			try {
				const filesAfter = await fs.readdir(siteRoot);
				console.log('Files in siteRoot after build:', filesAfter);
			} catch (e) {
				console.error(
					'Failed to read siteRoot directory after build:',
					e.message
				);
			}

			// Copy the built site from Astro's output directory to our dist directory
			const astroDist = `${siteRoot}/dist`;
			console.log(`Checking for Astro dist directory at: ${astroDist}`);
			console.log(`Target dist directory: ${RUN.dist}`);

			const astroDistExists = await fs
				.stat(astroDist)
				.then(() => true)
				.catch((e) => {
					console.log(`Astro dist stat error:`, e.message);
					return false;
				});

			if (astroDistExists) {
				console.log(`Astro dist directory found, contents:`);
				try {
					const distContents = await fs.readdir(astroDist);
					console.log(distContents);
				} catch (e) {
					console.log(`Could not read dist contents:`, e.message);
				}

				// Check if source and destination are the same
				if (path.resolve(astroDist) === path.resolve(RUN.dist)) {
					console.log(
						`Astro output is already in the correct location: ${RUN.dist}`
					);
					console.log(`No copying needed - build is complete!`);
				} else {
					// Ensure target directory exists and is empty
					try {
						await fs.rm(RUN.dist, { recursive: true, force: true });
						await fs.mkdir(path.dirname(RUN.dist), { recursive: true });
					} catch (e) {
						console.log(`Error preparing target directory:`, e.message);
					}

					try {
						await fs.cp(astroDist, RUN.dist, { recursive: true });
						console.log(
							`Successfully copied built site from ${astroDist} to ${RUN.dist}`
						);
					} catch (copyError) {
						console.error(`Copy failed:`, copyError);
						throw copyError;
					}
				}
			} else {
				console.error(`Astro dist directory not found: ${astroDist}`);
				// Let's see what actually exists in siteRoot
				try {
					const rootContents = await fs.readdir(siteRoot);
					console.log(`Contents of siteRoot (${siteRoot}):`, rootContents);

					// Check if there's a dist directory anywhere else
					for (const item of rootContents) {
						const itemPath = `${siteRoot}/${item}`;
						const stat = await fs.stat(itemPath).catch(() => null);
						if (stat?.isDirectory() && item.includes('dist')) {
							console.log(`Found potential dist directory: ${itemPath}`);
							const contents = await fs.readdir(itemPath).catch(() => []);
							console.log(`Contents:`, contents);
						}
					}
				} catch (e) {
					console.log(`Could not inspect siteRoot:`, e.message);
				}
				throw new Error(
					'Astro build did not produce expected output directory'
				);
			}
		} catch (error) {
			console.error('Build or copy failed:', error.message);
			if (error.stdout) console.error('Error stdout:', error.stdout);
			if (error.stderr) console.error('Error stderr:', error.stderr);
			throw error;
		}
	});
}

console.timeEnd(TOTAL);
console.log('');
