// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightVersions from 'starlight-versions';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.pepr.dev',
	integrations: [
		starlight({
			plugins: [
				starlightVersions({
					versions: [
						{ slug: 'v0.54', label: 'v0.54' },
						{ slug: 'v0.53', label: 'v0.53' },
					],
					current: { slug: 'main', label: 'main (unreleased)' }
				}),
			],
			title: 'Pepr',
			description: 'Pepr Documentation',
			logo: {
				src: './src/assets/pepr.svg',
			},
			social: [
				{ 
					icon: 'github', 
					label: 'GitHub', 
					href: 'https://github.com/defenseunicorns/pepr' 
				}
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
					label: 'Tutorials',
					autogenerate: { directory: 'pepr-tutorials' },
				},
				{
					label: 'Best Practices',
					autogenerate: { directory: 'best-practices' },
				},
				{
					label: 'Module Examples',
					autogenerate: { directory: 'module-examples' },
				},
				{
					label: 'Community',
					autogenerate: { directory: 'community' },
				},
				{
					label: 'Contribute',
					autogenerate: { directory: 'contribute' },
				},
			],
		}),
	],
});
