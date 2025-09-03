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
						{ slug: 'current', label: 'v0.53.0' },
						// { slug: 'v0.53.1', label: 'v0.53.1' },
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
						'current/user-guide/pepr-cli',
						'current/user-guide/pepr-modules',
						'current/user-guide/sdk',
						'current/user-guide/capabilities',
						'current/user-guide/custom-resources',
						'current/user-guide/customization',
						'current/user-guide/filters',
						'current/user-guide/generating_custom_metrics',
						'current/user-guide/generating-crds',
						'current/user-guide',
						'current/user-guide/metrics',
						'current/user-guide/onschedule',
						'current/user-guide/rbac',
						'current/user-guide/store',
						{
							label: 'Actions',
							collapsed: false,
							items: [
								'current/user-guide/actions/mutate',
								'current/user-guide/actions/validate',
								'current/user-guide/actions/reconcile',
								'current/user-guide/actions/watch',
								'current/user-guide/actions/finalize',
								'current/user-guide/actions',
								'current/user-guide/actions/using-alias-child-logger',
							],
						},
						
					],
				},
				{
					label: 'Tutorials',
					items: [
						'current/pepr-tutorials/create-pepr-module',
						'current/pepr-tutorials/create-pepr-dashboard',
						'current/pepr-tutorials/create-pepr-operator',
						'current/pepr-tutorials/pepr-gitops-workflow',
					],
				},
				{
					label: 'Best Practices',
					items: ['current/best-practices'],
				},
				{
					label: 'Examples',
					items: ['current/module-examples'],
				},
				{
					label: 'Community',
					items: [
						'current/community',
						'current/community/pepr-media',
						'current/contribute',
						'current/support',
					],
				},
				{
					label: 'Reference',
					items: [
						'current/faq',
						'current/roadmap',
						'current/security',
						'current/code_of_conduct',
					],
				},
			],
		}),
	],
});
