import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightVersions from 'starlight-versions';
import starlightLinksValidator from 'starlight-links-validator';
import starlightImageZoom from 'starlight-image-zoom';
import starlightContextualMenu from 'starlight-contextual-menu';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.pepr.dev',

	redirects: {},
	integrations: [
		starlight({
			plugins: [
				starlightContextualMenu({
					actions: ['copy', 'view', 'chatgpt', 'claude'],
				}),
				starlightLinksValidator(),
				starlightImageZoom(),
				starlightVersions({
					versions: [
						{ slug: 'current', label: 'v0.53.1' },
						// { slug: 'v0.53.0', label: 'v0.53.0' },
						// { slug: 'v0.53.0', label: 'v0.53.0' },
						// { slug: 'v0.52.3', label: 'v0.52.3' },
						// { slug: 'v0.52.2', label: 'v0.52.2' },
						// { slug: 'v0.52.1', label: 'v0.52.1' },
						// { slug: 'v0.52.0', label: 'v0.52.0' },
						
					],
				}),
			],
			defaultLocale: 'root',
			locales: {
				root: {
					label: 'English',
					lang: 'en',
				},
			},
			title: 'PEPR Documentation',
			description: 'PEPR Documentation - Defense Unicorns',
			social: [
				{
					icon: 'github',
					href: 'https://github.com/defenseunicorns/pepr',
					label: 'GitHub',
				},
			],
			sidebar: [
				{
					label: 'User Guide',
					items: [
						'user-guide/pepr-cli',
						'user-guide/pepr-modules',
						'user-guide/sdk',
						// 'user-guide/actions/index',
						{
							label: 'Actions',
							collapsed: false,
							items: [
								'user-guide/actions/mutate',
								'user-guide/actions/validate',
								'user-guide/actions/reconcile',
								'user-guide/actions/watch',
								'user-guide/actions/finalize',
							],
						},
						'user-guide/capabilities',
						'user-guide/store',
						'user-guide/pepr-modules',
						'user-guide/custom-resources',
						'user-guide/onschedule',
						'user-guide/rbac',
						'user-guide/metrics',
						'user-guide/customization',
						'user-guide/filters',
						'user-guide/generating-crds',
						'user-guide/generating_custom_metrics',
					],
				},
				{
					label: 'Tutorials',
					items: [
						'pepr-tutorials/create-pepr-module',
						'pepr-tutorials/create-pepr-dashboard',
						'pepr-tutorials/create-pepr-operator',
						'pepr-tutorials/pepr-gitops-workflow',
					],
				},
				// {
				// 	label: 'Best Practices',
				// 	items: ['best-practices/index'],
				// },
				// {
				// 	label: 'Examples',
				// 	items: ['module-examples/index'],
				// },
				{
					label: 'Community',
					items: [
						// 'community/index',
						'community/pepr-media',
						// 'contribute/index',
						// 'support/index',
					],
				},
				// {
				// 	label: 'Reference',
				// 	items: [
				// 		'faq/index',
				// 		'roadmap/index',
				// 		'security/index',
				// 		'code_of_conduct/index',
				// 	],
				// },
			],
		}),
	],
});
