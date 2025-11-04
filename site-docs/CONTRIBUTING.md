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
cd ..
git clone https://github.com/defenseunicorns/pepr.git
cd pepr
npm install
cd ../pepr-docs
```

3. Create a `.env` file to configure the core repository path:

```bash
# Create .env file with path to Pepr core repo
# If pepr and pepr-docs are siblings:
echo 'CORE=../pepr' > .env

# If pepr is in a different location:
echo 'CORE=/path/to/pepr' > .env
```

## Development Workflow

### Building the Documentation

The build system generates versioned documentation from the core repository. This process:

- Extracts documentation for active versions from the core repo
- Generates redirects for retired versions
- Creates versioned content in `src/content/docs/`

### Building and Running Locally

```bash
# Build the site (generates content from core repo and builds site)
npm run build

# Start development server
npm run dev
```

**Testing with Netlify (for redirects):**

Use when testing redirects or mimicking the Netlify environment:

```bash
npm run build
npm run dev:netlify
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

For changes and additions to the technical content of the docs, changes must be made to the [Pepr](https://github.com/defenseunicorns/pepr) core repo.
Any content changes made to the Pepr-Docs repo will be overwritten by Pepr on the next build.
See [Workflow](./ARCHITECTURE.md#Workflow) for additional details.

### Updating Site UI, structure and functionality

For changes to site structure, components, or layouts make changes to this repo.

1. Build the site: `npm run build`
2. Test locally with `npm run dev`

### Adding a Manual Redirect

1. Follow instructions found in the [REDIRECTS.md](./REDIRECTS.md#adding-manual-redirects).
2. Add tests in `build/tests/redirects-generator.test.mjs`
3. Update documentation

### Code Quality and Formatting

The project uses automated linting and formatting tools to maintain code quality.

**Available Commands:**

```bash
# Check formatting (runs all checks)
npm run format:check

# Auto-fix formatting issues
npm run format:fix

# Individual checks
npm run format:code        # ESLint for JS/TS files
npm run format:markdown    # Markdownlint for .md/.mdx files
npm run format:prettier    # Prettier for all files
```

**Pre-commit Hooks:**

The project uses Husky and lint-staged to automatically format files before commit:

- Code files: ESLint auto-fix
- Markdown files: Markdownlint auto-fix
- Shell scripts: Shellcheck validation
- JSON files: Prettier formatting

If pre-commit checks fail, the commit will be blocked. Run `npm run format:fix` to resolve issues.

## Pull Request Guidelines

### Before Submitting

- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Code is formatted: `npm run format:check` (or run `npm run format:fix` to auto-fix)
- [ ] Documentation updated (if needed)
- [ ] Redirects tested locally with `npm run dev:netlify` (if applicable)
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

**Note: All changes and additions to the content must be made in the [Pepr](https://github.com/defenseunicorns/pepr) repo.**

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

### Using Callouts and Alerts

We support both GitHub-style alerts and Starlight callouts for highlighting important information.
Both syntaxes are supported thanks to the `starlight-github-alerts` plugin.

**GitHub Alert Syntax (Recommended for Core Repo):**

```markdown
> [!NOTE]
> General information or helpful context

> [!TIP]
> Helpful suggestions or best practices

> [!IMPORTANT]
> Critical information that users need to know

> [!WARNING]
> Critical content demanding immediate user attention

> [!CAUTION]
> Negative potential consequences of an action
```

**Starlight Syntax (Alternative):**

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

:::danger
Critical warnings requiring immediate attention
:::
```

**Available Callout/Alert Types:**

- **`NOTE` / `:::note`** - Blue, for general information
- **`TIP` / `:::tip`** - Green, for helpful suggestions
- **`IMPORTANT`** - Purple, for critical information
- **`WARNING` / `:::danger`** - Red, for critical warnings
- **`CAUTION` / `:::caution`** - Orange, for warnings and important considerations

Both syntaxes render identically and can be used interchangeably.

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
