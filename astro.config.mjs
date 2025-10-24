import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightVersions from 'starlight-versions';
import starlightLlmsTxt from 'starlight-llms-txt';
import tailwindcss from '@tailwindcss/vite';
import starlightLinksValidator from 'starlight-links-validator';
import { getStarlightVersions } from './build/version-discovery.mjs';
import starlightGitHubAlerts from 'starlight-github-alerts'
import starlightContextualMenu from 'starlight-contextual-menu';
import starlightImageZoom from 'starlight-image-zoom'


const coreRepoPath = process.env.CORE || process.env.PEPR_CORE_PATH;
let dynamicVersions = [];

if (coreRepoPath) {
	try {
		dynamicVersions = await getStarlightVersions(coreRepoPath, 2);
		console.log('dynamicVersions =', dynamicVersions);
	} catch (error) {
		console.warn('Could not discover versions dynamically:', error.message);
		console.warn(
			'Using empty versions array - build will include only latest content'
		);
	}
} else {
	console.warn(
		'No core repository path provided (CORE or PEPR_CORE_PATH environment variable)'
	);
	console.warn(
		'Using empty versions array - build will include only latest content'
	);
}

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.pepr.dev',
	integrations: [
		starlight({
			favicon: '/pepr.svg',
			plugins: [
				...(process.env.CHECK_LINKS ? [starlightLinksValidator()] : []),
				starlightLlmsTxt(),
				starlightGitHubAlerts(),
				starlightImageZoom(),
				starlightContextualMenu({
					actions: ['copy', 'view', 'chatgpt', 'claude', 'grok'],
				}),
				starlightVersions({
					versions: dynamicVersions,
					current: { label: 'Latest' },
				}),
			],
			customCss: ['./src/styles/global.css'],
			title: 'Pepr',
			description: 'Pepr Documentation',
			logo: {
				src: './public/assets/pepr.png',
			},
			head: [
				{
					tag: 'link',
					attrs: {
						rel: 'stylesheet',
						href: 'https://fonts.googleapis.com/css2?family=Aldrich&display=swap',
					},
				},
			],
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/defenseunicorns/pepr',
				},
			],
			editLink: {
				baseUrl: 'https://github.com/defenseunicorns/pepr-docs/edit/main/',
			},
			sidebar: [
				{
					label: 'User Guide',
					autogenerate: { directory: 'user-guide' },
				},
				{
					label: 'Actions',
					autogenerate: { directory: 'actions' },
				},
				{
					label: 'Tutorials',
					autogenerate: { directory: 'tutorials' },
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
				{
					label: 'Community and Support',
					autogenerate: { directory: 'community' },
				},
				{
					label: 'Contribute',
					autogenerate: { directory: 'contribute' },
				},
				{
					label: 'Roadmap for Pepr',
					slug: 'roadmap',
				},
			],
		}),
	],

	vite: {
		plugins: [tailwindcss()],
	},
});
