# Build System Architecture

This document describes the architecture and workflow of the Pepr documentation build system.

## Overview

The build system is responsible for generating versioned documentation and managing redirects for the Pepr documentation site.
It's designed to maintain multiple documentation versions while ensuring users can always find content through intelligent redirects.

**Deployment:**

- **Nightly builds**: Pepr core runs nightly builds that trigger documentation generation and deploys to production.
- **PR merges**: Documentation deploys automatically when PRs are merged to main in the docs repo.

## Core Components

### 1. Documentation Framework (Starlight)

The site is built with [Starlight](https://starlight.astro.build), a documentation framework built on Astro.

**Version Management:**

- Uses [@astrojs/starlight-versions](https://www.npmjs.com/package/@astrojs/starlight-versions) plugin
- Enables version dropdown in navigation
- Manages versioned content structure
- Configuration in `astro.config.mjs`

**Site Configuration:**

Starlight is configured in `astro.config.mjs` using Astro's configuration system:

```javascript
export default defineConfig({
  site: 'https://docs.pepr.dev',
  integrations: [
    starlight({
      title: 'Pepr Documentation',
      sidebar: [
        { label: 'Getting Started', items: [...] },
        { label: 'User Guide', items: [...] },
        // Auto-generated from directory structure
      ],
      social: {
        github: 'https://github.com/defenseunicorns/pepr'
      },
      plugins: [
        starlightVersions({
          // Version plugin configuration
        })
      ]
    })
  ]
})
```

- `defineConfig()` - Astro's configuration helper
- `site` - Base URL for the deployed site (used for SEO and sitemap generation)
- `integrations` - Array of Astro integrations, including Starlight
- `plugins` - Starlight-specific plugins like the versions plugin

**Content Organization:**

- Content lives in `src/content/docs/`
- Each version has its own directory (e.g., `v0.54/`, `v0.55/`)
- Sidebar navigation is auto-generated from folder structure
- Frontmatter in markdown files controls page metadata:

  ```yaml
  ---
  title: Page Title
  description: Page description for SEO
  ---
  ```

### 2. Build Orchestrator (`build/index.mjs`)

The main entry point that coordinates the entire build process.

**Responsibilities:**

- Parse command-line arguments
- Coordinate version management
- Trigger redirect generation
- Manage the overall build workflow

**Key Inputs:**

- `--core`: Path to the Pepr core repository (for git tags)
- `--site`: Path to the documentation content directory

### 3. Redirect Generator (`build/redirects-generator.mjs`)

Generating Netlify redirect rules.

**Redirect Types:**

1. Manual Redirects - Specific path fixes
2. Patch-to-Minor Redirects - Automatic - Active version patches
3. Retired Version Redirects - Automatic - Catch-all for old versions

→ See [REDIRECTS.md](./REDIRECTS.md#how-it-works) for detailed explanation of redirect types and examples.

## Workflow

### Build Process

```text
1. Parse Arguments
   ├─ --core: Path to Pepr core repository
   └─ --site: Path to documentation content
   ↓
2. Clone Core Repository to tmp/ Directory
   ├─ Creates temporary tmp directory (gitignored)
   └─ Clones specified core repo for git tag access
   ↓
3. Fetch Git Tags (from core repo clone)
   ├─ Gets all version tags (e.g., v0.54.0, v0.55.1)
   └─ Filters to valid semver tags only
   ↓
4. Extract Documentation from Core
   ├─ Reads markdown files from core repo
   ├─ Processes and transforms for site structure
   └─ Organizes by version
   ↓
5. Generate Version Content
   ├─ Creates src/content/docs/v0.54/ (generated, gitignored)
   ├─ Creates src/content/docs/v0.55/ (generated, gitignored)
   └─ Generates version index files
   ↓
6. Generate Redirects
   ├─ Manual Redirects
   ├─ Patch-to-Minor Redirects (active versions)
   └─ Retired Version Redirects
   ↓
7. Write _redirects File
   └─ Creates public/_redirects (generated, gitignored)
   ↓
8. Clean Up
   └─ Removes tmp/ directory
   ↓
9. Build Documentation Site (Astro)
   └─ Generates static site in dist/
```

### Deployment Process

```text
1. Build Job (CI)
   ├─ Runs on PR and main branch pushes
   ├─ Generates all build artifacts
   └─ Uploads dist/ as CI artifact
   ↓
2. Deploy Job (CI - only on main branch)
   ├─ Checks out deploy branch
   ├─ Downloads dist/ artifact
   ├─ Commits dist/ to deploy branch
   └─ Pushes to deploy branch
   ↓
3. Netlify Deployment
   └─ Deploys from deploy branch to production
```

**Note:** Build artifacts are never committed to the main branch. The deploy branch contains only the built site (dist/) for Netlify deployment.

## Data Flow

```text
┌─────────────────────────┐
│  Pepr Core Repository   │
│  (External Source)      │
└───────────┬─────────────┘
            │
            ↓ (clone to tmp/)
┌───────────────────────────────────────┐
│         tmp/ Directory                │
│  ┌──────────────┐  ┌────────────────┐│
│  │  Git Tags    │  │  Docs (*.md)   ││
│  │  (versions)  │  │  (content)     ││
│  └──────┬───────┘  └────────┬───────┘│
└─────────┼──────────────────┼─────────┘
          │                  │
          ↓                  ↓
┌─────────────────┐  ┌──────────────────────┐
│  Version Info   │  │  Extract & Transform │
│  - Active       │  │  Documentation       │
│  - Retired      │  └──────────┬───────────┘
└────────┬────────┘             │
         │                      ↓
         │           ┌──────────────────────┐
         │           │  src/content/docs/   │
         │           │  ├─ v0.54/           │
         │           │  └─ v0.55/           │
         │           └──────────────────────┘
         │
         ↓
┌────────────────────────┐
│  Redirect Generator    │
├────────────────────────┤
│  1. Manual Redirects   │
│  2. Patch-to-Minor     │
│  3. Retired Versions   │
└──────────┬─────────────┘
           │
           ↓
┌──────────────────────┐
│  public/_redirects   │
│  (Netlify format)    │
└──────────────────────┘
           │
           ↓
┌──────────────────────┐
│  Astro Build         │
│  → dist/             │
└──────────────────────┘
```

## Version Management

### Active Versions

- Currently maintained documentation versions
- Receive patch-to-minor redirects
- Latest 2 major.minor releases
- Example: `v0.54`, `v0.55`

### Retired Versions

- Old documentation versions no longer maintained
- All traffic redirected to root (latest version)
- Example: `v0.53`, `v0.52`, `v0.51`

### Version Lifecycle

```text
New Release → Active Version → Retired Version
 ('latest')   (2 releases)    (redirect to root)
```

## File Structure

```text
build/
├── index.mjs                         # Main build orchestrator
├── *.mjs                             # Generator modules (redirects, etc.)
└── tests/
    └── *.test.mjs                    # Test suite

site-docs/
└── *.md                              # Documentation site documentation

src/content/docs/
├── v*/                               # Generated: Version directory
├── v*/                               # Generated: Version directory
└── index.md                          # Root documentation page

public/
└── _redirects                        # Generated: Netlify redirects file
```

## Testing Strategy

### Test Coverage

- Unit tests for each redirect generator function
- Integration tests for the full generation flow
- Tests verify both content and counts
- Separate tests for exact vs wildcard redirects

### Running Tests

```bash
npm run test -w build -- tests/redirects-generator.test.mjs
```
