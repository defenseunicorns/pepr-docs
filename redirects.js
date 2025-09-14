export const redirects = {
	//Legacy Doc Conversion Redirects
	// Redirect /main
	'/main': '/',
	'/latest': '/',
	'/latest/user-guide': '/user-guide',

	//   'main' to ''
	'/main/user-guide/': '/user-guide/',
	'/main/user-guide/pepr-cli/': '/user-guide/pepr-cli/',
	'/main/user-guide/sdk/': '/user-guide/sdk/',
	'/main/user-guide/pepr-modules/': '/user-guide/pepr-modules/',
	'/main/user-guide/capabilities/': '/user-guide/capabilities/',
	'/main/user-guide/custom-resources/': '/user-guide/custom-resources/',
	'/main/user-guide/customization/': '/user-guide/customization/',
	'/main/user-guide/feature-flags/': '/user-guide/feature-flags/',
	'/main/user-guide/filters/': '/user-guide/filters/',
	'/main/user-guide/generating_custom_metrics/':
		'/user-guide/generating-custom-metrics/',
	'/main/user-guide/generating-crds/': '/user-guide/generating-crds/',
	'/main/user-guide/metrics/': '/user-guide/metrics/',
	'/main/user-guide/onschedule/': '/user-guide/onschedule/',
	'/main/user-guide/rbac/': '/user-guide/rbac/',
	'/main/user-guide/store/': '/user-guide/store/',
	'/main/user-guide/actions/': '/actions/',
	'/main/user-guide/actions/mutate': '/actions/mutate',
	'/main/user-guide/actions/validate': '/actions/validate',
	'/main/user-guide/actions/reconcile': '/actions/reconcile',
	'/main/user-guide/actions/watch': '/actions/watch',
	'/main/user-guide/actions/finalize/': '/actions/finalize',
	'/main/user-guide/actions/using-alias-child-logger/':
		'/actions/using-alias-child-logger/',
	'/main/pepr-tutorials/': '/pepr-tutorials/',
	'/main/pepr-tutorials/create-pepr-module/':
		'/pepr-tutorials/create-pepr-module/',
	'/main/pepr-tutorials/create-pepr-dashboard/':
		'/pepr-tutorials/create-pepr-dashboard/',
	'/main/pepr-tutorials/create-pepr-operator/':
		'/pepr-tutorials/create-pepr-operator/',
	'/main/pepr-tutorials/pepr-gitops-workflow/':
		'/pepr-tutorials/pepr-gitops-workflow/',
	'/main/module-examples/': '/reference/module-examples/',
	'/main/best-practices/': '/reference/best-practices/',
	'/main/faq/': '/reference/faq/',
	'/main/community/': '/community/',
	'/main/community/pepr-media/': '/community/pepr-media/',
	'/main/security/': '/community/security/',
	'/main/support/': '/community/support/',
	'/main/contribute/': '/contribute/contributor-guide/',
	'/main/code_of_conduct/': '/contribute/code-of-conduct/',
	'/main/roadmap/': '/roadmap/',

	// v0.54.0 to v0.54
	'/v0.54.0/user-guide/': '/v0.54/user-guide/',
	'/v0.54.0/user-guide/pepr-cli/': '/v0.54/user-guide/pepr-cli/',
	'/v0.54.0/user-guide/sdk/': '/v0.54/user-guide/sdk/',
	'/v0.54.0/user-guide/pepr-modules/': '/v0.54/user-guide/pepr-modules/',
	'/v0.54.0/user-guide/capabilities/': '/v0.54/user-guide/capabilities/',
	'/v0.54.0/user-guide/custom-resources/':
		'/v0.54/user-guide/custom-resources/',
	'/v0.54.0/user-guide/customization/': '/v0.54/user-guide/customization/',
	'/v0.54.0/user-guide/feature-flags/': '/v0.54/user-guide/feature-flags/',
	'/v0.54.0/user-guide/filters/': '/v0.54/user-guide/filters/',
	'/v0.54.0/user-guide/generating_custom_metrics/':
		'/v0.54/user-guide/generating-custom-metrics/',
	'/v0.54.0/user-guide/generating-crds/': '/v0.54/user-guide/generating-crds/',
	'/v0.54.0/user-guide/metrics/': '/v0.54/user-guide/metrics/',
	'/v0.54.0/user-guide/onschedule/': '/v0.54/user-guide/onschedule/',
	'/v0.54.0/user-guide/rbac/': '/v0.54/user-guide/rbac/',
	'/v0.54.0/user-guide/store/': '/v0.54/user-guide/store/',
	'/v0.54.0/user-guide/actions/': '/v0.54/actions/',
	'/v0.54.0/user-guide/actions/mutate': '/v0.54/actions/mutate',
	'/v0.54.0/user-guide/actions/validate': '/v0.54/actions/validate',
	'/v0.54.0/user-guide/actions/reconcile': '/v0.54/actions/reconcile',
	'/v0.54.0/user-guide/actions/watch': '/v0.54/actions/watch',
	'/v0.54.0/user-guide/actions/finalize/': '/v0.54/actions/finalize',
	'/v0.54.0/user-guide/actions/using-alias-child-logger/':
		'/v0.54/actions/using-alias-child-logger/',
	'/v0.54.0/pepr-tutorials/': '/v0.54/pepr-tutorials/',
	'/v0.54.0/pepr-tutorials/create-pepr-module/':
		'/v0.54/pepr-tutorials/create-pepr-module/',
	'/v0.54.0/pepr-tutorials/create-pepr-dashboard/':
		'/v0.54/pepr-tutorials/create-pepr-dashboard/',
	'/v0.54.0/pepr-tutorials/create-pepr-operator/':
		'/v0.54/pepr-tutorials/create-pepr-operator/',
	'/v0.54.0/pepr-tutorials/pepr-gitops-workflow/':
		'/v0.54/pepr-tutorials/pepr-gitops-workflow/',
	'/v0.54.0/module-examples/': '/v0.54/reference/module-examples/',
	'/v0.54.0/best-practices/': '/v0.54/reference/best-practices/',
	'/v0.54.0/faq/': '/v0.54/reference/faq/',
	'/v0.54.0/community/': '/v0.54/community/',
	'/v0.54.0/community/pepr-media/': '/v0.54/community/pepr-media/',
	'/v0.54.0/security/': '/v0.54/community/security/',
	'/v0.54.0/support/': '/v0.54/community/support/',
	'/v0.54.0/contribute/': '/v0.54/contribute/contributor-guide/',
	'/v0.54.0/code_of_conduct/': '/v0.54/contribute/code-of-conduct/',
	'/v0.54.0/roadmap/': '/v0.54/roadmap/',

	// v0.53.1 to v0.53
	'/v0.53.1/user-guide/': '/v0.53/user-guide/',
	'/v0.53.1/user-guide/pepr-cli/': '/v0.53/user-guide/pepr-cli/',
	'/v0.53.1/user-guide/sdk/': '/v0.53/user-guide/sdk/',
	'/v0.53.1/user-guide/pepr-modules/': '/v0.53/user-guide/pepr-modules/',
	'/v0.53.1/user-guide/capabilities/': '/v0.53/user-guide/capabilities/',
	'/v0.53.1/user-guide/custom-resources/':
		'/v0.53/user-guide/custom-resources/',
	'/v0.53.1/user-guide/customization/': '/v0.53/user-guide/customization/',
	'/v0.53.1/user-guide/feature-flags/': '/v0.53/user-guide/feature-flags/',
	'/v0.53.1/user-guide/filters/': '/v0.53/user-guide/filters/',
	'/v0.53.1/user-guide/generating_custom_metrics/':
		'/v0.53/user-guide/generating-custom-metrics/',
	'/v0.53.1/user-guide/generating-crds/': '/v0.53/user-guide/generating-crds/',
	'/v0.53.1/user-guide/metrics/': '/v0.53/user-guide/metrics/',
	'/v0.53.1/user-guide/onschedule/': '/v0.53/user-guide/onschedule/',
	'/v0.53.1/user-guide/rbac/': '/v0.53/user-guide/rbac/',
	'/v0.53.1/user-guide/store/': '/v0.53/user-guide/store/',
	'/v0.53.1/user-guide/actions/': '/v0.53/actions/',
	'/v0.53.1/user-guide/actions/mutate': '/v0.53/actions/mutate',
	'/v0.53.1/user-guide/actions/validate': '/v0.53/actions/validate',
	'/v0.53.1/user-guide/actions/reconcile': '/v0.53/actions/reconcile',
	'/v0.53.1/user-guide/actions/watch': '/v0.53/actions/watch',
	'/v0.53.1/user-guide/actions/finalize/': '/v0.53/actions/finalize',
	'/v0.53.1/user-guide/actions/using-alias-child-logger/':
		'/v0.53/actions/using-alias-child-logger/',
	'/v0.53.1/pepr-tutorials/': '/v0.53/pepr-tutorials/',
	'/v0.53.1/pepr-tutorials/create-pepr-module/':
		'/v0.53/pepr-tutorials/create-pepr-module/',
	'/v0.53.1/pepr-tutorials/create-pepr-dashboard/':
		'/v0.53/pepr-tutorials/create-pepr-dashboard/',
	'/v0.53.1/pepr-tutorials/create-pepr-operator/':
		'/v0.53/pepr-tutorials/create-pepr-operator/',
	'/v0.53.1/pepr-tutorials/pepr-gitops-workflow/':
		'/v0.53/pepr-tutorials/pepr-gitops-workflow/',
	'/v0.53.1/module-examples/': '/v0.53/reference/module-examples/',
	'/v0.53.1/best-practices/': '/v0.53/reference/best-practices/',
	'/v0.53.1/faq/': '/v0.53/reference/faq/',
	'/v0.53.1/community/': '/v0.53/community/',
	'/v0.53.1/community/pepr-media/': '/v0.53/community/pepr-media/',
	'/v0.53.1/security/': '/v0.53/community/security/',
	'/v0.53.1/support/': '/v0.53/community/support/',
	'/v0.53.1/contribute/': '/v0.53/contribute/contributor-guide/',
	'/v0.53.1/code_of_conduct/': '/v0.53/contribute/code-of-conduct/',
	'/v0.53.1/roadmap/': '/v0.53/roadmap/',

	// Version-specific redirects
	'/v0.54.0/': '/v0.54/',
	'/v0.53.0/': '/v0.53/',
};
