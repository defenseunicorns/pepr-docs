---
title: Pepr CLI
weight: 10
---


## `npx pepr`

Type safe K8s middleware for humans

**Options:**

- `-V, --version` - output the version number
- `-h, --help` - display help for command

**Commands:**

  init [options]         Initialize a new Pepr Module
  build [options]        Build a Pepr Module for deployment
  deploy [options]       Deploy a Pepr Module
  dev [options]          Setup a local webhook development environment
  update [options]       Update this Pepr module. Not recommended for prod as it may change files.
  format [options]       Lint and format this Pepr module
  monitor [module-uuid]  Monitor a Pepr Module
  uuid [uuid]            Module UUID(s) currently deployed in the cluster
  kfc [args...]          Execute Kubernetes Fluent Client commands
  crd                    Scaffold and generate Kubernetes CRDs from structured TypeScript definitions

## `npx pepr build`

Build a Pepr Module for deployment.

**Options:**

- `-e, --entry-point [file]` - Specify the entry point file to build with. (default: "pepr.ts")
- `-n, --no-embed` - Disables embedding of deployment files into output module. Useful when creating library modules intended solely for reuse/distribution via NPM.
- `-i, --custom-image <custom-image>` - Specify a custom image (including version) for Admission and Watch Deployments. Example: 'docker.io/username/custom-pepr-controller:v1.0.0'
- `-r, --registry-info [<registry>/<username>]` - Provide the image registry and username for building and pushing a custom WASM container. Requires authentication. Builds and pushes 'registry/username/custom-pepr-controller:<current-version>'.
- `-o, --output-dir <output directory>` - Define where to place build output
- `--timeout <timeout>` - How long the API server should wait for a webhook to respond before treating the call as a failure
- `--withPullSecret <imagePullSecret>` - Image Pull Secret: Use image pull secret for controller Deployment. (default: "")
- `--registry <GitHub|Iron Bank>` - Container registry: Choose container registry for deployment manifests. Can't be used with --custom-image. (choices: "GitHub", "Iron Bank")
- `-z, --zarf [manifest|chart]` - Zarf package type: manifest, chart (default: manifest) (choices: "manifest", "chart", default: "manifest")
- `--rbac-mode [admin|scoped]` - Rbac Mode: admin, scoped (default: admin) (choices: "admin", "scoped")
- `--custom-name [name]` - Specify a custom name for zarf component and service monitors in helm charts.
- `-h, --help` - display help for command

Create a [zarf.yaml](https://zarf.dev) and K8s manifest for the current module. This includes everything needed to deploy Pepr and the current module into production environments.

## `npx pepr crd`

Scaffold and generate Kubernetes CRDs from structured TypeScript definitions.

**Options:**

- `-h, --help` - display help for command

**Commands:**

  create [options]    Create a new CRD TypeScript definition
  generate [options]  Generate CRD manifests from TypeScript definitions
  help [command]      display help for command

## `npx pepr crd create`

Create a new CRD TypeScript definition.

**Options:**

- `--group <group>` - API group (e.g. cache)
- `--version <version>` - API version (e.g. v1alpha1)
- `--kind <kind>` - Kind name (e.g. Memcached)
- `--domain <domain>` - Optional domain (e.g. pepr.dev) (default: "pepr.dev")
- `--scope <Namespaced | Cluster>` - Whether the resulting custom resource is cluster- or namespace-scoped (default: "Namespaced")
- `--plural <plural>` - Plural name (e.g. memcacheds) (default: "")
- `--shortName <shortName>` - Short name (e.g. mc) (default: "")
- `-h, --help` - display help for command

## `npx pepr crd generate`

Generate CRD manifests from TypeScript definitions

**Options:**

- `--output <output>` - Output directory for generated CRDs (default: "./crds")
- `-h, --help` - display help for command

## `npx pepr deploy`

Deploy the current module into a Kubernetes cluster, useful for CI systems. Not recommended for production use.

**Options:**

- `-i, --image [image]` - Override the image tag
- `--confirm` - Skip confirmation prompt
- `--pullSecret <name>` - Deploy imagePullSecret for Controller private registry
- `--docker-server <server>` - Docker server address
- `--docker-username <username>` - Docker registry username
- `--docker-email <email>` - Email for Docker registry
- `--docker-password <password>` - Password for Docker registry
- `--force` - Force deploy the module, override manager field
- `-h, --help` - display help for command

## `npx pepr dev`

Setup a local webhook development environment

**Options:**

- `-h, --host [host]` - Host to listen on (default: "host.k3d.internal")
- `--confirm` - Skip confirmation prompt
- `--help` - display help for command

Connect a local cluster to a local version of the Pepr Controller to do real-time debugging of your module. Note the `npx pepr dev` assumes a K3d cluster is running by default. If you are working with Kind or another docker-based K8s distro, you will need to pass the `--host host.docker.internal` option to `npx pepr dev`. If working with a remote cluster you will have to give Pepr a host path to your machine that is reachable from the K8s cluster.

NOTE: This command, by necessity, installs resources into the cluster you run it against.  Generally, these resources are removed once the `pepr dev` session ends but there are two notable exceptions:

- the `pepr-system` namespace, and
- the `PeprStore` CRD.

These can't be auto-removed because they're global in scope & doing so would risk wrecking any other Pepr deployments that are already running in-cluster.  If (for some strange reason) you're _not_ `pepr dev`-ing against an ephemeral dev cluster and need to keep the cluster clean, you'll have to remove these hold-overs yourself (or not)!

## `npx pepr format`

Lint and format this Pepr module.

**Options:**

- `-v, --validate-only` - Do not modify files, only validate formatting.
- `-h, --help` - display help for command

## `npx pepr init`

Initialize a new Pepr Module.

**Options:**

- `--confirm` - Skip verification prompt when creating a new module.
- `--description <string>` - Explain the purpose of the new module.
- `--name <string>` - Set the name of the new module.
- `--skip-post-init` - Skip npm install, git init, and VSCode launch.
- `--errorBehavior <audit|ignore|reject>` - Set an errorBehavior.
- `--uuid [string]` - Unique identifier for your module with a max length of 36 characters.
- `-h, --help` - display help for command

## `npx pepr kfc`

Execute a `kubernetes-fluent-client` command. This command is a wrapper around `kubernetes-fluent-client`.

**Options:**

- `-h, --help` - display help for command

Usage:

```bash
npx pepr kfc [options] [command]
```

If you are unsure of what commands are available, you can run `npx pepr kfc` to see the available commands.

For example, to generate usable types from a Kubernetes CRD, you can run `npx pepr kfc crd [source] [directory]`. This will generate the types for the `[source]` CRD and output the generated types to the `[directory]`.

You can learn more about the `kubernetes-fluent-client` [here](https://github.com/defenseunicorns/kubernetes-fluent-client).


## `npx pepr monitor`

Monitor Validations for a given Pepr Module or all Pepr Modules.

**Options:**

- `-h, --help` - display help for command

Usage:

```bash
npx pepr monitor [options] [module-uuid]
```

**Options:**

- `-h, --help` - display help for command

## `npx pepr update`

Update the current Pepr Module to the latest SDK version. This command is not recommended for production use, instead, we recommend Renovate or Dependabot for automated updates.

**Options:**

- `--skip-template-update` - Skip updating the template files
- `-h, --help` - display help for command

## `npx pepr uuid`

Module UUID(s) currently deployed in the cluster with their descriptions. `[uuid]` represents a specific module uuid in the cluster.

**Options:**

- `-h, --help` - display help for command