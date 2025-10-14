# Contributing to Pepr Documentation

Thank you for contributing to the Pepr documentation! This guide will help you get started.

## Quick Start

### Setup

1. Clone the docs repository and install deps:
```bash
git clone https://github.com/defenseunicorns/pepr-docs.git
cd pepr-docs
npm install
```
2. Clone the core repository and install deps:
```bash
git clone https://github.com/defenseunicorns/pepr.git
cd pepr
npm install
```

## Development Workflow

### Building the Documentation

Generate versioned documentation from the core repository:

```bash
node build/index.mjs --core "$CORE" --site ./src/content/docs
```

This will:
- Clone the core repo to `work/` (temporary)
- Extract documentation for active versions
- Generate redirects
- Create versioned content in `src/content/docs/`

### Building and Running Locally

Start the development server:

```bash
 export CORE="<path/to/local/pepr>"
  node build/index.mjs --core "$CORE" --site ./src/content/docs
  npm run build
  npm run dev
```
Running Netlify development server. Use when testing redirects or to mimic Netlify environment. 

```bash
 export CORE="<path/to/local/pepr>"
  node build/index.mjs --core "$CORE" --site ./src/content/docs
  npm run build
  netlify dev
```

### Testing

Run the test suite:

```bash
npm test
```

Run specific tests:

```bash
npm run test -w build -- tests/redirects-generator.test.mjs
```

## Making Changes

### Updating Site Content
For changes and additions to the technical content of the docs, changes must be made to the [Pepr](https://github.com/defenseunicorns/pepr) core repo. Any content changes made to the Pepr-Docs repo will be overwritten by Pepr on the next build. See [Workflow](../README-docs/ARCHITECTURE.md#Workflow) for additional details.

### Updating Site UI, structure and functionality

For changes to site structure, components, or layouts make changes to this repo.

1. Test locally with `npm run dev`
2. Build to verify: `npm run build`

### Adding a Manual Redirect
1. Follow instructions found in the [REDIRECTS.md](../README-docs/REDIRECTS.md#adding-manual-redirects).
3. Add tests in `build/tests/redirects-generator.test.mjs`
4. Update documentation

## Pull Request Guidelines

### Before Submitting

- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Documentation updated (if needed)
- [ ] Redirects tested locally with `netlify dev`
- [ ] No generated files committed (check `.gitignore`)

### PR Description

Include:

1. **What** - Brief description of changes
2. **Why** - Reason for the change
3. **How** - Approach taken
4. **Testing** - How you verified it works

Example:

```markdown
## What
Added redirect for renamed documentation page

## Why
Users are getting 404s on the old URL

## How
Added manual redirect in MANUAL_REDIRECTS

## Testing
- Rebuilt site
- Verified redirect in public/_redirects
- Tested with netlify dev
```

### Commit Messages

Use clear, descriptive commit messages:

```bash
# Good
git commit -m "fix: add redirect for renamed actions page"
git commit -m "feat: add support for version-specific redirects"
git commit -m "docs: update architecture documentation"

# Avoid
git commit -m "fix stuff"
git commit -m "updates"
```

## Writing Documentation
**Note: All  changes and additions to the content must be made in the [Pepr](https://github.com/defenseunicorns/pepr) repo.**

### Frontmatter

Every documentation page must start with YAML frontmatter containing metadata:

```markdown
---
title: Page Title
description: Brief description for SEO and previews
---
```

**Required fields:**
- `title` - The page title shown in navigation and browser tab
- `description` - Brief description used for SEO and page previews

### Code Blocks

Use fenced code blocks with language identifiers for syntax highlighting:

````markdown
```typescript
const example = "code here";
```

```bash
npm install
```
````

### Using Callouts

Starlight provides callout syntax for highlighting important information. The build system automatically converts GitHub-style callouts from the core repository, but you can also use Starlight syntax directly.

**Starlight Syntax:**
```markdown
:::note
General information or helpful context
:::

:::tip
Helpful suggestions or best practices
:::

:::caution
Warnings or important considerations
:::
```

**Available Callout Types:**
- **`:::note`** - Blue, for general information
- **`:::tip`** - Green, for helpful suggestions
- **`:::caution`** - Yellow, for warnings
- **`:::warning`** - Orange, for critical warnings
- **`:::important`** - Purple, for important notices

### Links

**Internal links** to other documentation pages:
```markdown
[Link text](/user-guide/capabilities)
```

**External links** with full URLs:
```markdown
[GitHub](https://github.com/defenseunicorns/pepr)
```

### Images

Embed images using standard markdown syntax:
```markdown
![Alt text](/assets/image.png)
```

Images in the `public/` directory are served at the root URL path.

### Additional Information
- **Documentation**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- **Redirects**: See [REDIRECTS.md](./REDIRECTS.md) for redirect guide
- **Issues**: Open an issue on [GitHub](https://github.com/defenseunicorns/pepr-docs/issues)
