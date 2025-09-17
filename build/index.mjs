import { program } from 'commander';
import * as path from 'node:path';
import * as process from 'node:process';
import * as fs from 'node:fs/promises';
import * as util from 'node:util';
import * as child_process from 'node:child_process';
import * as semver from 'semver';
import { glob } from 'glob';
import { heredoc } from './heredoc.mjs';

const exec = util.promisify(child_process.exec);

// Normalize all image paths to use /assets/ directory for better compatibility
function fixImagePaths(content) {
	return content
		.replace(/_images\/pepr-arch\.svg/g, '/assets/pepr-arch.png')
		.replace(/_images\/pepr-arch\.png/g, '/assets/pepr-arch.png')
		.replace(/_images\/pepr\.png/g, '/assets/pepr.png')
		.replace(/resources\/create-pepr-operator\/(light|dark)\.png/g, '/assets/$1.png')
		.replace(/\.\.\/\.\.\/\.\.\/images\/([\w-]+\.png)/g, '/assets/$1');
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
		console.time(label);
		await func(log);
	} catch (e) {
		err = e;
	} finally {
		console.timeEnd(label);
		log.forEach(([key, val]) => {
			console.log(' ', key.padEnd(10), ':', val);
		});

		if (err) {
			['', err, '', 'State dump:', RUN].forEach((m) => console.error(m));
			program.error('');
		}

		console.log();
	}
}

function majmin(version) {
	return `${semver.major(version)}.${semver.minor(version)}`;
}

function rewriteRemoteVideoLinks(content) {
	// rewrite raw githubusercontent video links into video tags
	return content.replaceAll(
		/https[\S]*.mp4/g,
		(url) => `<video class="td-content" controls src="${url}"></video>`
	);
}

function isInt(str) {
	return Number.isInteger(Number(str));
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
	Array.from(content.matchAll(/\]\([^)]*\)/g), (m) => m[0]).forEach(
		(mdLink) => {
			let parts = mdLink.replace('](', '').replace(')', '').split('/');
			if (parts.at(-1) === 'README.md') {
				parts.pop();
			}
			if (parts[0].startsWith('_images')) {
				parts[0] = '__images';
			}
			let newLink = `](${parts.join('/')})`;
			content = content.replaceAll(mdLink, newLink);
		}
	);
	return content;
}

function rewriteFileLinksAsLowerCase(content) {
	Array.from(content.matchAll(/\]\([^)]*\)/g), (m) => m[0]).forEach(
		(mdLink) => {
			let newLink = mdLink.toLowerCase();
			content = content.replaceAll(mdLink, newLink);
		}
	);
	return content;
}

function escapeAtParamReferences(content) {
	// Escapes @param in markdown bold syntax to prevent MDX parsing issues
	content = content.replaceAll(/\*\*@param\b/g, '**\\@param');

	// Convert HTML comments to MDX comments since MDX prefers {/* */} syntax
	content = content.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

	// Escape email addresses in angle brackets that aren't already in links or code
	content = content.replace(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g, '&lt;$1&gt;');

	// Escape any remaining angle brackets that contain @ or ! characters that could be interpreted as invalid HTML tags
	// This catches edge cases like <@something> or <!something> that aren't proper HTML
	content = content.replace(/<([^>]*[@!][^>]*)>/g, '&lt;$1&gt;');

	// Convert GitHub-style callouts to MDX admonitions
	content = content.replace(
		/^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]\n((?:^>.*\n?)*)/gm,
		(match, type, calloutContent) => {
			const mdxType = type.toLowerCase();

			// Remove the '> ' prefix from each line and clean up
			const cleanContent = calloutContent
				.split('\n')
				.map(line => line.replace(/^> ?/, ''))
				.filter(line => line.length > 0)
				.join('\n');

			console.log(`Converting ${type} callout to MDX admonition`);
			return `:::${mdxType}\n${cleanContent}\n:::`;
		}
	);

	return content;
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
	let { stdout } = await exec(`
    cd ${RUN.core}
    git tag
  `);
	const tags = stdout.trim().split('\n');
	const vers = tags.filter(semver.valid);
	const sort = semver.rsort(vers);

	const majmins = sort
		.map((v) => majmin(v))
		.reduce((list, mm) => {
			list.includes(mm) ? null : list.push(mm);
			return list;
		}, []);

	let ongoing = majmins.slice(0, RUN.cutoff);
	RUN.retired = majmins.slice(RUN.cutoff);

	// Only process the latest version of each major.minor to reduce build time
	RUN.versions = ongoing.map(mm => {
		return sort.find(ver => majmin(ver) === mm);
	}).filter(Boolean);
	RUN.versions.push('latest');

	log.push(['ongoing', ongoing]);
	log.push(['retired', RUN.retired]);
	log.push(['versions', RUN.versions]);
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
		const resourceDirs = await glob(`${srcresources}/**/resources`, { onlyDirectories: true });
		for (const resourceDir of resourceDirs) {
			const relativePath = path.relative(srcresources, resourceDir);
			const dstPath = path.join(dstresources, relativePath);
			await fs.mkdir(path.dirname(dstPath), { recursive: true });
			await fs.cp(resourceDir, dstPath, { recursive: true });
			log.push(['copied', `${resourceDir} -> ${dstPath}`]);
		}
	});

	await activity('Process root level markdown files', async () => {
		const rootMdFiles = ['SECURITY.md', 'CODE_OF_CONDUCT.md', 'SUPPORT.md'];
    let rootMdDir = '';
		try {
			for (let rootMdFile of rootMdFiles) {
				const rootMdPath = `${RUN.core}/${rootMdFile}`;
				const rootMdExists = await fs
					.stat(rootMdPath)
					.then(() => true)
					.catch(() => false);

				if (rootMdExists) {
          let targetFileName;
          if (rootMdFile === 'SECURITY.md') {
            rootMdDir = `090_community`;
            targetFileName = 'security.md';
          } else if (rootMdFile === 'CODE_OF_CONDUCT.md') {
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
					console.log('${rootMdFile} does not exist.');
				}
			}
		} catch (error) {
			console.error('Failed to process ${rootMdFile}:', error);
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
			){
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
				'user-guide/actions': 'actions'
			};

			// Handle single-file mappings (README.md files that should become direct .md files)
			const singleFileMapping = {
				'best-practices': 'reference/best-practices.md',
				'module-examples': 'reference/module-examples.md',
				'faq': 'reference/faq.md',
				'roadmap': 'roadmap.md'
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
			if (RUN.srcmd.newfile.endsWith('/README.md') || RUN.srcmd.newfile === 'README.md') {
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
				// Prepend version to create full slug path
				const fullSlug = slugPath === 'index' ? versionMajMin : `${versionMajMin}/${slugPath}`;
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
			RUN.srcmd.content = rewriteRemoteVideoLinks(RUN.srcmd.content);

			const baseFile = path.basename(RUN.srcmd.file);

			if (baseFile !== 'README.md') {
				RUN.srcmd.content = RUN.srcmd.content
					.replaceAll('](../', '](../../')
					.replaceAll('](./', '](../');
			}

			RUN.srcmd.content = rewriteNumberedFileLinks(RUN.srcmd.content);

			RUN.srcmd.content = rewriteReadmeFileLinks(RUN.srcmd.content);

			RUN.srcmd.content = rewriteFileLinksAsLowerCase(RUN.srcmd.content);

			RUN.srcmd.content = escapeAtParamReferences(RUN.srcmd.content);

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
      description: Pepr Documentation - ${RUN.version}${slugField ? `\n      ${slugField}` : ''}
      ---
    `;
		const rootMd = `${RUN.core}/README.md`;
		let idxBody = await fs.readFile(rootMd, { encoding: 'utf8' });

		// strip first heading
		const headings = idxBody.match(/#[\s]+(.*)/);
		idxBody = idxBody.replaceAll(headings[0], '');

		// trim 'docs' out of link paths
		idxBody = idxBody.replaceAll('](./docs/', '](./');

		idxBody = rewriteReadmeFileLinks(idxBody);

		idxBody = rewriteFileLinksAsLowerCase(idxBody);

		idxBody = idxBody.replaceAll('.md)', '/)');

		// rewrite raw githubusercontent video links into video tags
		idxBody = rewriteRemoteVideoLinks(idxBody);

		// rewrite numbered file links
		idxBody = rewriteNumberedFileLinks(idxBody);

		// convert GitHub callouts to MDX admonitions
		idxBody = idxBody.replace(
			/^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]\n((?:^>.*\n?)*)/gm,
			(match, type, calloutContent) => {
				const mdxType = type.toLowerCase();
				const cleanContent = calloutContent
					.split('\n')
					.map(line => line.replace(/^> ?/, ''))
					.filter(line => line.length > 0)
					.join('\n');
				console.log(`Converting ${type} callout in index to MDX admonition`);
				return `:::${mdxType}\n${cleanContent}\n:::`;
			}
		);

		const idxContent = [idxFront, idxBody].join('\n');
		await fs.writeFile(idxMd, idxContent, { encoding: 'utf8' });

		log.push(['dst', idxMd]);
	});
}

await activity(`Set current version alias`, async (log) => {
	// Find the latest stable version (non-prerelease)
	const stableVersions = RUN.versions.filter(v => v !== 'latest' && semver.prerelease(v) === null);
	if (stableVersions.length === 0) {
		log.push(['current', 'no stable versions found']);
		return;
	}
	
	const currentVersion = stableVersions[0]; // Already sorted by rsort, so first is latest
	const currentMajMin = majmin(currentVersion);
	
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
	if (await fs.stat(targetDir).then(() => true).catch(() => false)) {
		// Copy the content instead of symlink for better compatibility
		await fs.cp(targetDir, currentDir, { recursive: true });
		log.push(['current', `v${currentMajMin} (${currentVersion})`]);
		log.push(['target', targetDir]);
		log.push(['alias', currentDir]);
	} else {
		log.push(['error', `target version directory not found: ${targetDir}`]);
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
		console.log('Copying images and resources to src and public directories...');
		
		// Check what static directories exist
		const staticDirs = await fs.readdir(`${RUN.work}/static`).catch(() => []);
		console.log('Available static directories:', staticDirs);
		
		// Clean existing directories (only need resources since we use assets for images)
		await fs.rm(`${siteRoot}/src/content/docs/resources`, { recursive: true, force: true });
		
		// Try to copy images and resources from any available version
		let resourcesCopied = false;
		for (const version of ['main', 'v0.54.0', 'v0.53.1']) {
			const staticVersionPath = `${RUN.work}/static/${version}`;
			const imagesPath = `${staticVersionPath}/_images`;
			const resourcesPath = `${staticVersionPath}/040_pepr-tutorials/resources`;
			
			if (await fs.stat(imagesPath).then(() => true).catch(() => false)) {
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
			
			if (await fs.stat(resourcesPath).then(() => true).catch(() => false)) {
				console.log(`Copying resources from ${resourcesPath} to src directories`);
				await fs.mkdir(`${siteRoot}/src/content/docs/resources`, { recursive: true });
				
				// Copy each subdirectory but flatten the numbered prefix
				const resourceSubdirs = await fs.readdir(resourcesPath, { withFileTypes: true });
				for (const dirent of resourceSubdirs) {
					if (dirent.isDirectory()) {
						const srcDir = path.join(resourcesPath, dirent.name);
						// Remove numbered prefix (e.g., "030_create-pepr-operator" -> "create-pepr-operator")
						const cleanName = dirent.name.replace(/^\d+_/, '');
						const dstDir = path.join(`${siteRoot}/src/content/docs/resources`, cleanName);
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
		if (await fs.stat(`${RUN.work}/content/latest`).then(() => true).catch(() => false)) {
			await fs.cp(`${RUN.work}/content/latest`, starlightContentDir, { recursive: true });
		}
		
		// Fix image paths in main content files
		console.log('Fixing image paths in content files...');
		const contentFiles = await glob(`${starlightContentDir}/**/*.md`);
		let updatedFilesCount = 0;
		let calloutsFixedCount = 0;
		for (const contentFile of contentFiles) {
			const content = await fs.readFile(contentFile, 'utf8');
			let updatedContent = fixImagePaths(content);

			// Convert any remaining GitHub callouts to MDX admonitions
			const beforeCallouts = updatedContent;
			updatedContent = updatedContent.replace(
				/^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]\n((?:^>.*\n?)*)/gm,
				(match, type, calloutContent) => {
					const mdxType = type.toLowerCase();
					const cleanContent = calloutContent
						.split('\n')
						.map(line => line.replace(/^> ?/, ''))
						.filter(line => line.length > 0)
						.join('\n');
					console.log(`Final pass: Converting ${type} callout in ${contentFile}`);
					return `:::${mdxType}\n${cleanContent}\n:::`;
				}
			);

			if (beforeCallouts !== updatedContent) {
				calloutsFixedCount++;
			}

			if (content !== updatedContent) {
				await fs.writeFile(contentFile, updatedContent);
				updatedFilesCount++;
			}
		}
		if (updatedFilesCount > 0) {
			console.log(`Updated image paths in ${updatedFilesCount} files`);
		}
		if (calloutsFixedCount > 0) {
			console.log(`Fixed callouts in ${calloutsFixedCount} files during final pass`);
		}
		
		// Copy resource images to assets directory
		const resourceImages = await glob(`${siteRoot}/src/content/docs/resources/**/*.png`);
		if (resourceImages.length > 0) {
			console.log(`Copying ${resourceImages.length} resource images to assets directory...`);
			for (const resourceImage of resourceImages) {
				const imageName = path.basename(resourceImage);
				const destPath = `${publicDir}/assets/${imageName}`;
				await fs.cp(resourceImage, destPath);
			}
		}
		
		// Copy versioned content only for versions declared in astro.config.mjs
		// Filter to only process versions that exist in starlight-versions configuration
		const configuredVersions = ['v0.54.0', 'v0.53.1']; // Should match astro.config.mjs
		const availableConfiguredVersions = RUN.versions.filter(v =>
			v !== 'latest' && configuredVersions.some(cv => v === cv)
		);
		console.log(`Processing only configured versions: ${availableConfiguredVersions.join(', ')}`);

		for (const version of availableConfiguredVersions) {
			const versionContentPath = `${RUN.work}/content/${version}`;
			const versionMajMin = version.replace(/^v(\d+\.\d+)\.\d+$/, 'v$1');
			const starlightVersionDir = `${siteRoot}/src/content/docs/${versionMajMin}`;

			if (await fs.stat(versionContentPath).then(() => true).catch(() => false)) {
				console.log(`Processing version ${version} - ensuring atomic operations...`);
				await fs.mkdir(starlightVersionDir, { recursive: true });
				await fs.cp(versionContentPath, starlightVersionDir, { recursive: true });

				// Small delay to ensure file system operations complete
				await new Promise(resolve => setTimeout(resolve, 100));

				// IMMEDIATELY convert callouts in versioned content
				const versionedFiles = await glob(`${starlightVersionDir}/**/*.md`);
				console.log(`Checking ${versionedFiles.length} versioned files (${versionMajMin}) for callouts...`);
				for (const file of versionedFiles) {
					const content = await fs.readFile(file, 'utf8');

					// Check for callouts first
					const hasCallouts = content.includes('> [!');
					if (hasCallouts) {
						console.log(`Found callouts in versioned file (${versionMajMin}): ${file}`);
					}

					const converted = content.replace(
						/^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\](?:\n((?:^>.*\n?)*))?/gm,
						(match, type, calloutContent) => {
							const mdxType = type.toLowerCase();
							let cleanContent = '';
							if (calloutContent) {
								cleanContent = calloutContent
									.split('\n')
									.map(line => line.replace(/^> ?/, ''))
									.filter(line => line.length > 0)
									.join('\n');
							}
							console.log(`Immediate: Converting ${type} callout in versioned ${file} (${versionMajMin})`);
							return cleanContent ? `:::${mdxType}\n${cleanContent}\n:::` : `:::${mdxType}\n:::`;
						}
					);
					if (content !== converted) {
						await fs.writeFile(file, converted);
					}
				}

				// Fix image paths in versioned content files
				console.log(`Fixing image paths in versioned content ${versionMajMin}...`);
				const versionContentFiles = await glob(`${starlightVersionDir}/**/*.md`);
				let versionUpdatedCount = 0;
				let versionCalloutsFixedCount = 0;
				for (const contentFile of versionContentFiles) {
					const content = await fs.readFile(contentFile, 'utf8');
					let updatedContent = fixImagePaths(content);

					// Convert any remaining GitHub callouts to MDX admonitions in versioned content
					const beforeCallouts = updatedContent;
					updatedContent = updatedContent.replace(
						/^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]\n((?:^>.*\n?)*)/gm,
						(match, type, calloutContent) => {
							const mdxType = type.toLowerCase();
							const cleanContent = calloutContent
								.split('\n')
								.map(line => line.replace(/^> ?/, ''))
								.filter(line => line.length > 0)
								.join('\n');
							console.log(`Final pass: Converting ${type} callout in versioned ${contentFile}`);
							return `:::${mdxType}\n${cleanContent}\n:::`;
						}
					);

					if (beforeCallouts !== updatedContent) {
						versionCalloutsFixedCount++;
					}

					if (content !== updatedContent) {
						await fs.writeFile(contentFile, updatedContent);
						versionUpdatedCount++;
					}
				}
				if (versionUpdatedCount > 0) {
					console.log(`Updated image paths in ${versionUpdatedCount} versioned files`);
				}
				if (versionCalloutsFixedCount > 0) {
					console.log(`Fixed callouts in ${versionCalloutsFixedCount} versioned files during final pass`);
				}
			}
		}

		// FINAL COMPREHENSIVE CALLOUT CONVERSION
		// Convert ALL callouts in ALL possible locations before Astro starts
		console.log('FINAL: Converting all callouts in ALL locations before Astro starts...');

		// Scan ALL possible locations where starlight-versions might look
		const searchPaths = [
			`${siteRoot}/src/content/**/*.{md,mdx}`,
			`${siteRoot}/work/**/*.{md,mdx}`,
			`${RUN.work}/**/*.{md,mdx}`,
			`${siteRoot}/**/*.{md,mdx}`
		];

		let allMarkdownFiles = [];
		for (const searchPath of searchPaths) {
			try {
				const files = await glob(searchPath, {
					ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**']
				});
				allMarkdownFiles.push(...files);
			} catch (e) {
				// Path might not exist, continue
			}
		}

		// Remove duplicates
		allMarkdownFiles = [...new Set(allMarkdownFiles)];
		console.log(`FINAL: Scanning ${allMarkdownFiles.length} markdown files across all locations`);

		let totalConversions = 0;
		for (const file of allMarkdownFiles) {
			try {
				const content = await fs.readFile(file, 'utf8');

				// Check for any callout patterns
				if (content.includes('> [!')) {
					console.log(`FINAL: Found callouts in ${file}`);

					const converted = content.replace(
						/^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\](?:\n((?:^>.*\n?)*))?/gm,
						(match, type, calloutContent) => {
							const mdxType = type.toLowerCase();
							let cleanContent = '';
							if (calloutContent) {
								cleanContent = calloutContent
									.split('\n')
									.map(line => line.replace(/^> ?/, ''))
									.filter(line => line.length > 0)
									.join('\n');
							}
							console.log(`FINAL: Converting ${type} callout in ${file}`);
							totalConversions++;
							return cleanContent ? `:::${mdxType}\n${cleanContent}\n:::` : `:::${mdxType}\n:::`;
						}
					);

					if (content !== converted) {
						await fs.writeFile(file, converted);
					}
				}
			} catch (e) {
				// File might be locked or not readable, continue
				console.log(`FINAL: Could not process ${file}: ${e.message}`);
			}
		}

		if (totalConversions > 0) {
			console.log(`FINAL: Converted ${totalConversions} callouts total across all locations`);
		} else {
			console.log('FINAL: No callouts found to convert in any location');
		}

		// Add delay to prevent race condition with starlight-versions plugin
		console.log('Waiting for file system operations to stabilize...');
		await new Promise(resolve => setTimeout(resolve, 500));

		try {
			console.log(`Building Starlight site from directory: ${siteRoot}`);
			console.log(`Expected dist output: ${siteRoot}/dist`);

			// Check what's in siteRoot before building
			try {
				const files = await fs.readdir(siteRoot);
				console.log('Files in siteRoot before build:', files);
			} catch (e) {
				console.error('Failed to read siteRoot directory:', e.message);
			}

			// CRITICAL: Convert any remaining callouts BEFORE astro build starts
			// This must happen before starlight-versions plugin scans content
			console.log('CRITICAL: Pre-astro callout conversion - scanning ALL possible locations...');

			// Scan EVERYWHERE that starlight-versions might look
			const contentGlobs = [
				`${siteRoot}/src/content/**/*.{md,mdx}`,
				`${siteRoot}/src/content/docs/v*/**/*.{md,mdx}`, // versioned content
				`${siteRoot}/**/*.md`, // Any markdown files anywhere
				`${siteRoot}/README.md`, // Root readme
				`${siteRoot}/src/**/*.{md,mdx}`, // Any src markdown
			];

			let allContentFiles = [];
			for (const glob_pattern of contentGlobs) {
				const files = await glob(glob_pattern, {
					ignore: ['**/node_modules/**', '**/.git/**'] // Exclude node_modules and git
				});
				allContentFiles.push(...files);
			}

			// Remove duplicates
			allContentFiles = [...new Set(allContentFiles)];

			console.log(`Pre-astro: Found ${allContentFiles.length} markdown files to scan`);
			let preAstroFixCount = 0;

			for (const contentFile of allContentFiles) {
				try {
					const content = await fs.readFile(contentFile, 'utf8');
					let convertedContent = content;

					// First check if this file has any > [! patterns and log them
					const calloutMatches = content.match(/^> \[!.*$/gm);
					if (calloutMatches) {
						console.log(`FOUND CALLOUTS in ${contentFile}:`, calloutMatches);
					}

					// Convert GitHub callouts with more comprehensive pattern
					convertedContent = convertedContent.replace(
						/^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\](?:\n((?:^>.*\n?)*))?/gm,
						(match, type, calloutContent) => {
							const mdxType = type.toLowerCase();
							let cleanContent = '';
							if (calloutContent) {
								cleanContent = calloutContent
									.split('\n')
									.map(line => line.replace(/^> ?/, ''))
									.filter(line => line.length > 0)
									.join('\n');
							}
							console.log(`Pre-astro: Converting ${type} callout in ${contentFile}`);
							preAstroFixCount++;
							return cleanContent ? `:::${mdxType}\n${cleanContent}\n:::` : `:::${mdxType}\n:::`;
						}
					);

					// Also escape any problematic standalone exclamation marks
					const beforeEscape = convertedContent;
					convertedContent = convertedContent.replace(
						/^(\s*)!([A-Z][a-zA-Z]*\s)/gm,
						'$1\\!$2'
					);
					if (beforeEscape !== convertedContent) {
						console.log(`Pre-astro: Escaped standalone exclamation marks in ${contentFile}`);
						preAstroFixCount++;
					}

					if (content !== convertedContent) {
						await fs.writeFile(contentFile, convertedContent);
					}
				} catch (error) {
					console.log(`Pre-astro: Could not process ${contentFile}: ${error.message}`);
				}
			}

			if (preAstroFixCount > 0) {
				console.log(`CRITICAL: Pre-astro conversion fixed ${preAstroFixCount} potential MDX issues`);
			} else {
				console.log('Pre-astro check: no MDX issues found');
			}

			// Execute build with better error handling
			const buildResult = await exec(`cd ${siteRoot} && npm run build`, {
				maxBuffer: 1024 * 1024 * 10 // 10MB buffer
			});
			
			console.log('Build stdout:', buildResult.stdout);
			if (buildResult.stderr) {
				console.log('Build stderr:', buildResult.stderr);
			}
			
			// Check what's in siteRoot after building
			try {
				const filesAfter = await fs.readdir(siteRoot);
				console.log('Files in siteRoot after build:', filesAfter);
			} catch (e) {
				console.error('Failed to read siteRoot directory after build:', e.message);
			}
			
			// Copy the built site from Astro's output directory to our dist directory
			const astroDist = `${siteRoot}/dist`;
			console.log(`Checking for Astro dist directory at: ${astroDist}`);
			console.log(`Target dist directory: ${RUN.dist}`);
			
			const astroDistExists = await fs.stat(astroDist).then(() => true).catch((e) => {
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
					console.log(`Astro output is already in the correct location: ${RUN.dist}`);
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
						console.log(`Successfully copied built site from ${astroDist} to ${RUN.dist}`);
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
				throw new Error('Astro build did not produce expected output directory');
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
