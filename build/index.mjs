import { program } from 'commander';
import * as path from 'node:path';
import * as process from 'node:process';
import * as fs from 'node:fs/promises';
import * as util from 'node:util';
import * as child_process from 'node:child_process';
import * as semver from 'semver';
import { glob } from 'glob';
import { heredoc } from './heredoc.mjs';
import { discoverVersions, findCurrentVersion } from './version-discovery.mjs';

const exec = util.promisify(child_process.exec);

// Fix image paths in content
function fixImagePaths(content) {
	return content
		.replace(/_images\/pepr-arch\.svg/g, '/assets/pepr-arch.png')
		.replace(/_images\/pepr-arch\.png/g, '/assets/pepr-arch.png')
		.replace(/_images\/pepr\.png/g, '/assets/pepr.png')
		.replace(
			/resources\/create-pepr-operator\/(light|dark)\.png/g,
			'/assets/$1.png'
		)
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

// Efficient content processing pipeline
async function processAllContent(contentDir) {
	const contentFiles = await glob(`${contentDir}/**/*.md`);
	let updatedFilesCount = 0;
	let imagePathsFixedCount = 0;
	let calloutsFixedCount = 0;

	for (const contentFile of contentFiles) {
		const originalContent = await fs.readFile(contentFile, 'utf8');
		let processedContent = originalContent;

		// Apply image path fixes
		const afterImageFix = fixImagePaths(processedContent);
		if (afterImageFix !== processedContent) {
			imagePathsFixedCount++;
			processedContent = afterImageFix;
		}

		// Apply callout conversion
		const afterCalloutFix = convertCallouts(processedContent, contentFile);
		if (afterCalloutFix !== processedContent) {
			calloutsFixedCount++;
			processedContent = afterCalloutFix;
		}

		// Write file only if changes were made
		if (originalContent !== processedContent) {
			await fs.writeFile(contentFile, processedContent);
			updatedFilesCount++;
		}
	}

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

program
	.version('0.0.0', '-v, --version')
	.requiredOption('-c, --core <path>', 'path to core project folder')
	.requiredOption('-s, --site <path>', 'path to docs site folder')
	.option('-n, --no-dist', 'do not generate /dist output')
	.parse(process.argv);
const opts = program.opts();

const RUN = { cutoff: 2 }; // global state bucket!

async function activity(label, func) {
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

// Utility function for checking if a string is an integer
function isInt(str) {
	return Number.isInteger(Number(str));
}

// Convert remote video links to video tags
function convertVideoLinks(content) {
	return content.replaceAll(
		/https[\S]*.mp4/g,
		(url) => `<video class="td-content" controls src="${url}"></video>`
	);
}

// Remove numbered prefixes from path parts
function removeNumberedPrefixes(parts) {
	return parts.map((part) => {
		const [prefix, ...rest] = part.split('_');
		return isInt(prefix) ? rest.join('_') : part;
	});
}

// Handle special community file paths
function normalizeCommunityFilePaths(parts) {
	if (
		parts[0] === '..' &&
		parts[1] === '..' &&
		(parts[2] === 'CODE_OF_CONDUCT.md' ||
			parts[2] === 'SECURITY.md' ||
			parts[2] === 'SUPPORT.md')
	) {
		parts.shift();
	}
	return parts;
}

// Remove README.md from paths (treat directories as index)
function removeReadmeFromPaths(parts) {
	if (parts.at(-1) === 'README.md') {
		parts.pop();
	}
	return parts;
}

// Handle legacy image paths
function normalizeLegacyImagePaths(parts) {
	if (parts[0].startsWith('_images')) {
		parts[0] = '__images';
	}
	return parts;
}

// Process markdown links for file path cleanup
function processMarkdownLinks(content) {
	const linkMatches = Array.from(content.matchAll(/\]\([^)]*\)/g), (m) => m[0]);

	linkMatches.forEach((mdLink) => {
		let parts = mdLink.replace('](', '').replace(')', '').split('/');

		// Skip external URLs
		if (parts[0].startsWith('http')) {
			return;
		}

		// Apply transformations in sequence
		parts = normalizeCommunityFilePaths(parts);
		parts = removeNumberedPrefixes(parts);
		parts = removeReadmeFromPaths(parts);
		parts = normalizeLegacyImagePaths(parts);

		// Convert to lowercase and create new link
		const newLink = `](${parts.join('/').toLowerCase()})`;
		content = content.replaceAll(mdLink, newLink);
	});

	return content;
}

// Escape @param in markdown bold syntax
function escapeAtParams(content) {
	return content.replaceAll(/\*\*@param\b/g, '**\\@param');
}

// Convert HTML comments to MDX comments
function convertHtmlToMdxComments(content) {
	return content.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
}

// Escape email addresses in angle brackets
function escapeEmailAddresses(content) {
	return content.replace(
		/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g,
		'&lt;$1&gt;'
	);
}

// Escape problematic angle bracket content
function escapeProblematicAngleBrackets(content) {
	return content.replace(/<([^>]*[@!][^>]*)>/g, '&lt;$1&gt;');
}

// Escape MDX-problematic content
function escapeMdxContent(content) {
	return escapeAtParams(
		convertHtmlToMdxComments(
			escapeEmailAddresses(
				escapeProblematicAngleBrackets(content)
			)
		)
	);
}

// Content transformation pipeline - orchestrates all transformations
function transformContent(content) {
	return escapeMdxContent(
		processMarkdownLinks(
			convertVideoLinks(
				fixImagePaths(content)
			)
		)
	);
}

const TOTAL = 'Total build time';
console.time(TOTAL);

await activity(`Validate args`, async (log) => {
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

await activity(`Clean work dir`, async (log) => {
	await fs.rm(RUN.work, { recursive: true, force: true });
	await fs.mkdir(RUN.work);

	log.push(['work', RUN.work]);
});

await activity(`Copy site src to work dir`, async () => {
	await fs.cp(RUN.site, RUN.work, { recursive: true });
});

await activity(`Search core repo versions`, async (log) => {
	const { versions, retired } = await discoverVersions(RUN.core, RUN.cutoff);

	RUN.versions = versions;
	RUN.retired = retired;

	log.push(['versions', RUN.versions]);
	log.push(['retired', RUN.retired]);
});

await activity(`Nuke retired version content`, async (log) => {
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

for (const version of RUN.versions) {
	RUN.version = version;
	RUN.verdir = `${RUN.work}/content/${RUN.version}`;
	RUN.found = false;
	RUN.coredocs = `${RUN.core}/docs`;

	await activity(`Build ${RUN.version}`, async (log) => {
		let dirExists = async (path) => {
			try {
				if (!(await fs.stat(path)).isDirectory()) {
					return false;
				}
			} catch {
				return false;
			}

			return true;
		};

		RUN.found = await dirExists(RUN.verdir);

		// always rebuild main
		if (RUN.found && RUN.version === 'latest') {
			await fs.rm(RUN.verdir, { recursive: true, force: true });
			RUN.found = false;
		}

		log.push(['skip', RUN.found]);
	});

	if (RUN.found) {
		console.log(`Skipping ${RUN.version} - already built`);
		continue;
	}

	console.log(`Processing version ${RUN.version}...`);

	await activity(`Create version dir`, async (log) => {
		await fs.mkdir(RUN.verdir, { recursive: true });
		log.push(['dir', RUN.verdir]);
	});

	await activity(`Checkout core version`, async (log) => {
		const checkoutTarget = RUN.version === 'latest' ? 'main' : RUN.version;
		await exec(`
      cd ${RUN.core}
      git checkout ${checkoutTarget}
    `);

		let result =
			RUN.version === 'latest'
				? await exec(`cd ${RUN.core} ; git branch --show-current`)
				: await exec(`cd ${RUN.core} ; git describe --tags`);

		result = result.stdout.trim();

		log.push(['repo', RUN.core]);
		RUN.version === 'latest'
			? log.push(['branch', result])
			: log.push(['tag', result]);
	});

	await activity(`Find source doc files`, async (log) => {
		let sources = await fs.readdir(RUN.coredocs, { recursive: true });

		// TBD: impl sub-dir-to-site-menu structures once docs have content needing it
		// let subdirs = ""

		// process only .mds
		RUN.srcmds = sources.filter((f) => f.endsWith('.md'));

		// ...but not non-root README.md (they're just sub-menus for GH UI)
		RUN.srcmds = RUN.srcmds.filter((f) => !(f === 'README.md'));

		const srcign = sources.filter((s) => !RUN.srcmds.includes(s));

		log.push(['sources', RUN.srcmds]);
		log.push(['ignored', srcign]);
	});

	await activity(`Copy repo images`, async (log) => {
		const srcimgs = `${RUN.core}/_images`;
		const dstimgs = `${RUN.work}/static/${RUN.version}/_images`;
		await fs.cp(srcimgs, dstimgs, { recursive: true });

		log.push(['src', srcimgs]);
		log.push(['dst', dstimgs]);
	});

	await activity(`Copy repo resources`, async (log) => {
		const srcresources = `${RUN.core}/docs`;
		const dstresources = `${RUN.work}/static/${RUN.version}`;

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

	await activity('Process root level markdown files', async () => {
		const rootMdFiles = [
			'SECURITY.md',
			'CODE_OF_CONDUCT.md',
			'CODE-OF-CONDUCT.md',
			'SUPPORT.md',
		];
		let rootMdDir = '';
		try {
			for (let rootMdFile of rootMdFiles) {
				const rootMdPath = `${RUN.core}/${rootMdFile}`;
				const rootMdExists = await fs
					.stat(rootMdPath)
					.then(() => true)
					.catch(() => false);

				if (rootMdExists) {
					console.log(`Found ${rootMdFile} for version ${RUN.version}`);
					let targetFileName;
					if (rootMdFile === 'SECURITY.md') {
						rootMdDir = `090_community`;
						targetFileName = 'security.md';
					} else if (
						rootMdFile === 'CODE_OF_CONDUCT.md' ||
						rootMdFile === 'CODE-OF-CONDUCT.md'
					) {
						rootMdDir = `100_contribute`;
						targetFileName = 'code_of_conduct.md';
					} else if (rootMdFile === 'SUPPORT.md') {
						rootMdDir = `090_community`;
						targetFileName = 'support.md';
					}

					const indexFilePath = `${rootMdDir}/${targetFileName}`;

					// Create the directory if it does not exist
					await fs.mkdir(rootMdDir, { recursive: true });

					// Read content from root markdown file
					const content = await fs.readFile(rootMdPath, 'utf8');

					// Write content to community folder with appropriate filename
					await fs.writeFile(indexFilePath, content);

					// Add new community file path to RUN.srcmds
					if (!RUN.srcmds) {
						RUN.srcmds = [];
					}
					RUN.srcmds.push(indexFilePath);
				} else {
					console.log(
						`${rootMdFile} does not exist for version ${RUN.version}.`
					);
				}
			}
		} catch (error) {
			console.error(`Failed to process ${rootMdFile}:`, error);
		}
	});

	for (const srcmd of RUN.srcmds) {
		let src = '';
		RUN.srcmd = { file: srcmd, content: '' };

		await activity(`Read source file`, async (log) => {
			if (
				RUN.srcmd.file.endsWith('910_security/README.md') ||
				RUN.srcmd.file.endsWith('900_code_of_conduct/README.md') ||
				RUN.srcmd.file.endsWith('920_support/README.md') ||
				RUN.srcmd.file.endsWith('090_community/security.md') ||
				RUN.srcmd.file.endsWith('100_contribute/code_of_conduct.md') ||
				RUN.srcmd.file.endsWith('090_community/support.md')
			) {
				src = `${RUN.srcmd.file}`;
			} else {
				src = `${RUN.coredocs}/${RUN.srcmd.file}`;
			}
			RUN.srcmd.content = await fs.readFile(src, { encoding: 'utf8' });
			log.push(['src', src]);
		});

		await activity(`Gen weight and new file name`, async (log) => {
			const filename = path.basename(RUN.srcmd.file);
			let ancestors = path.dirname(RUN.srcmd.file).split('/');
			let parent = ancestors.pop();

			ancestors = ancestors.map((a) => {
				const [prefix, ...rest] = a.split('_');
				return isInt(prefix) ? rest.join('_') : [prefix, ...rest].join('_');
			});
			ancestors = ancestors.join('/');

			const pParts = parent.split('_');
			const pWeight = isInt(pParts[0]) ? Number.parseInt(pParts[0]) : null;
			let rawdir =
				pWeight !== null
					? [ancestors, pParts.slice(1).join('_').trim()]
							.filter((f) => f)
							.join('/')
					: [ancestors, pParts.join('_').trim()].filter((f) => f).join('/');

			// Map old structure to new structure for consistency
			const structureMapping = {
				'pepr-tutorials': 'tutorials',
				'user-guide/actions': 'actions',
			};

			// Handle single-file mappings (README.md files that should become direct .md files)
			const singleFileMapping = {
				'best-practices': 'reference/best-practices.md',
				'module-examples': 'reference/module-examples.md',
				faq: 'reference/faq.md',
				roadmap: 'roadmap.md',
			};

			let newdir = rawdir;

			// Apply folder structure mappings first
			for (const [oldPath, newPath] of Object.entries(structureMapping)) {
				if (rawdir.startsWith(oldPath)) {
					newdir = rawdir.replace(oldPath, newPath);
					break;
				}
			}

			const fParts = filename.split('_');
			let weight = isInt(fParts[0]) ? Number.parseInt(fParts[0]) : null;
			let newfile =
				weight !== null ? fParts.slice(1).join('_').trim() : filename.trim();

			if (newfile === 'README.md') {
				newfile = newfile.replace('README.md', 'index.md');
				weight = pWeight;
			}

			// Check if this is a single file that should be mapped directly (after processing filename)
			if (newfile === 'index.md') {
				for (const [oldPath, newPath] of Object.entries(singleFileMapping)) {
					if (rawdir === oldPath) {
						// This is a single file, return the direct path without directory
						newdir = '';
						newfile = newPath;
						break;
					}
				}
			}

			newfile = newdir === '.' ? newfile : [newdir, newfile].join('/');

			RUN.srcmd.weight = weight;
			RUN.srcmd.newfile = newfile;

			log.push(['weight', weight]);
			log.push(['newfile', newfile]);
		});

		await activity(`Inject Starlight front matter`, async () => {
			// title as sanitized content from first heading
			const heading = RUN.srcmd.content.match(/#[\s]+(.*)/);
			let title = heading[1].replaceAll('`', '').replaceAll(':', '');

			// Override title to "Overview" for README.md files
			if (
				RUN.srcmd.newfile.endsWith('/README.md') ||
				RUN.srcmd.newfile === 'README.md'
			) {
				title = 'Overview';
			}

			RUN.srcmd.content = RUN.srcmd.content.replaceAll(heading[0], '');

			// Generate slug for versioned content
			let slugField = '';
			if (RUN.version !== 'latest') {
				const versionMajMin = RUN.version.replace(/^v(\d+\.\d+)\.\d+$/, 'v$1');
				let slugPath = RUN.srcmd.newfile.replace(/\.md$/, '');
				// For index files, use the directory path
				if (slugPath.endsWith('/index')) {
					slugPath = slugPath.replace('/index', '');
				}
				// Clean up any leading/trailing slashes and empty parts
				slugPath = slugPath.replace(/^\/+|\/+$/g, '');
				// Prepend version to create full slug path
				const fullSlug =
					slugPath === '' || slugPath === 'index'
						? versionMajMin
						: `${versionMajMin}/${slugPath}`;
				slugField = `slug: ${fullSlug}`;
			}

			const front = heredoc`
        ---
        title: ${title}
        description: ${title}${slugField ? `\n        ${slugField}` : ''}
        ---
      `;
			RUN.srcmd.content = [front, RUN.srcmd.content].join('\n');
		});

		await activity(`Rewrite broken content`, async () => {
			// Apply unified content transformation pipeline
			RUN.srcmd.content = transformContent(RUN.srcmd.content);

			const baseFile = path.basename(RUN.srcmd.file);

			if (baseFile !== 'README.md') {
				RUN.srcmd.content = RUN.srcmd.content
					.replaceAll('](../', '](../../')
					.replaceAll('](./', '](../');
			}

			// Rewrite internal links to use new structure
			RUN.srcmd.content = RUN.srcmd.content
				.replaceAll('](/pepr-tutorials/', '](/tutorials/')
				.replaceAll('](/best-practices/', '](/reference/best-practices/')
				.replaceAll('](/module-examples/', '](/reference/module-examples/')
				.replaceAll('](/faq/', '](/reference/faq/')
				.replaceAll('](/user-guide/actions/', '](/actions/');

			RUN.srcmd.content = RUN.srcmd.content.replaceAll('.md)', '/)');

			RUN.srcmd.content = RUN.srcmd.content.replaceAll(
				/.md#(.*)\)/g,
				(_, group) => `#${group})`
			);

		});

		await activity(`Write result file`, async (log) => {
			const dirname = path.dirname(RUN.srcmd.newfile);
			await fs.mkdir(`${RUN.verdir}/${dirname}`, { recursive: true });

			const dst = `${RUN.verdir}/${RUN.srcmd.newfile}`;
			await fs.writeFile(dst, RUN.srcmd.content, { encoding: 'utf8' });
			log.push(['dst', dst]);
		});
	}

	await activity(`Write version layout & landing content`, async (log) => {
		const idxMd = `${RUN.verdir}/index.md`;

		// Generate slug for versioned index pages
		let slugField = '';
		if (RUN.version !== 'latest') {
			const versionMajMin = RUN.version.replace(/^v(\d+\.\d+)\.\d+$/, 'v$1');
			slugField = `slug: ${versionMajMin}`;
		}

		const idxFront = heredoc`
      ---
      title: Pepr
      description: Pepr Documentation - ${RUN.version}${
			slugField ? `\n      ${slugField}` : ''
		}
      ---
    `;
		const rootMd = `${RUN.core}/README.md`;
		let idxBody = await fs.readFile(rootMd, { encoding: 'utf8' });

		// strip first heading
		const headings = idxBody.match(/#[\s]+(.*)/);
		idxBody = idxBody.replaceAll(headings[0], '');

		// trim 'docs' out of link paths
		idxBody = idxBody.replaceAll('](./docs/', '](./');

		// Apply unified content transformation pipeline
		idxBody = transformContent(idxBody);

		idxBody = idxBody.replaceAll('.md)', '/');


		const idxContent = [idxFront, idxBody].join('\n');
		await fs.writeFile(idxMd, idxContent, { encoding: 'utf8' });

		log.push(['dst', idxMd]);
	});
}

await activity(`Process all work directory content`, async (log) => {
	// Process all content in work directory to fix image paths and callouts
	console.log('Processing work directory content (fixing image paths and callouts)...');
	const workContentDirs = await glob(`${RUN.work}/content/*`, { onlyDirectories: true });

	for (const workDir of workContentDirs) {
		const version = path.basename(workDir);
		console.log(`Processing work content for version: ${version}`);
		await processAllContent(workDir);
	}

	log.push(['processed', workContentDirs.length + ' version directories']);
});

await activity(`Set current version alias`, async (log) => {
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
await activity(`Generate version configuration files`, async (log) => {
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
	await activity(`Clean dist dir`, async (log) => {
		RUN.dist = path.resolve(`./dist`);
		await fs.rm(RUN.dist, { recursive: true, force: true });
		await fs.mkdir(RUN.dist);

		log.push(['dist', RUN.dist]);
	});

	await activity(`Build Starlight site into dist dir`, async () => {
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

		// Try to copy images and resources from any available version
		let resourcesCopied = false;
		for (const version of ['main', 'v0.54.0', 'v0.53.1']) {
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
