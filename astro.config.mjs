// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightVersions from 'starlight-versions';
import starlightLlmsTxt from 'starlight-llms-txt';
import tailwindcss from '@tailwindcss/vite';
import starlightLinksValidator from 'starlight-links-validator';
import { redirects } from './redirects.js';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.pepr.dev',
	redirects,
	integrations: [
		starlight({
			favicon: './public/pepr.svg',
			plugins: [
				...(process.env.CHECK_LINKS ? [starlightLinksValidator()] : []),
				starlightLlmsTxt(),
				starlightVersions({
					versions: [
						{ slug: 'v0.54', label: 'v0.54.0' },
						{ slug: 'v0.53', label: 'v0.53.1' },
					],
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
