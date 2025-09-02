import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightVersions from 'starlight-versions';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.pepr.dev',

	redirects: {},
	integrations: [
		starlight({
			plugins: [
				starlightVersions({
					versions: [
						{ slug: 'current', label: 'Current' },
						// { slug: 'v0.53.1', label: 'v0.53.1 (Latest)' },
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
						'main/user-guide/pepr-cli',
						'main/user-guide/pepr-modules',
						'main/user-guide/sdk',
						// 'main/user-guide/actions/index',
						{
							label: 'Actions',
							collapsed: false,
							items: [
								'main/user-guide/actions/mutate',
								'main/user-guide/actions/validate',
								'main/user-guide/actions/reconcile',
								'main/user-guide/actions/watch',
								'main/user-guide/actions/finalize',
							],
						},
						'main/user-guide/capabilities',
						'main/user-guide/store',
						'main/user-guide/pepr-modules',
						'main/user-guide/custom-resources',
						'main/user-guide/onschedule',
						'main/user-guide/rbac',
						'main/user-guide/metrics',
						'main/user-guide/customization',
						'main/user-guide/filters',
						'main/user-guide/generating-crds',
						'main/user-guide/generating_custom_metrics',
					],
				},
				{
					label: 'Tutorials',
					items: [
						'main/pepr-tutorials/create-pepr-module',
						'main/pepr-tutorials/create-pepr-dashboard',
						'main/pepr-tutorials/create-pepr-operator',
						'main/pepr-tutorials/pepr-gitops-workflow',
					],
				},
				// {
				// 	label: 'Best Practices',
				// 	items: ['main/best-practices/index'],
				// },
				// {
				// 	label: 'Examples',
				// 	items: ['main/module-examples/index'],
				// },
				{
					label: 'Community',
					items: [
						// 'main/community/index',
						'main/community/pepr-media',
						// 'main/contribute/index',
						// 'main/support/index',
					],
				},
				// {
				// 	label: 'Reference',
				// 	items: [
				// 		'main/faq/index',
				// 		'main/roadmap/index',
				// 		'main/security/index',
				// 		'main/code_of_conduct/index',
				// 	],
				// },
			],
		}),
	],
});
