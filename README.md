# Pepr Documentation

Official documentation site for [Pepr](https://github.com/defenseunicorns/pepr) - A Kubernetes controller framework built in TypeScript.

**Live Site:** <https://docs.pepr.dev>

## Overview

This repository contains the build system and site structure for the Pepr documentation. The actual documentation content is automatically extracted from the [Pepr core repository](https://github.com/defenseunicorns/pepr) and built into a versioned documentation site using [Starlight](https://starlight.astro.build).

## Quick Start

### Prerequisites

- Node.js (v18 or later)
- npm
- Access to the Pepr core repository

### Setup

1. Clone this repository:

```bash
git clone https://github.com/defenseunicorns/pepr-docs.git
cd pepr-docs
npm install
```

2. Clone the Pepr core repository:

```bash
git clone https://github.com/defenseunicorns/pepr.git
```

### Build and Run Locally

```bash
# Set the path to your Pepr core repository and generate content
export CORE="/path/to/pepr"
node build/index.mjs --core "$CORE" --site ./src/content/docs

# Build the site
npm run build

# Start development server
npm run dev
```

The site will be available at `http://localhost:4321`

### Test with Netlify Environment

To test redirects or mimic the Netlify environment:

```bash
export CORE="/path/to/pepr"
node build/index.mjs --core "$CORE" --site ./src/content/docs
npm run build
netlify dev
```

## Project Structure

```text
pepr-docs/
├── build/                   # Build system source code
│   ├── index.mjs            # Main build orchestrator
│   ├── redirects-generator.mjs
│   └── tests/               # Test suite
├── src/                     # Site source
│   ├── content/docs/        # Documentation content (generated, gitignored)
│   ├── components/          # Astro components
│   ├── pages/               # Custom pages
│   └── styles/              # Stylesheets
├── public/                  # Static assets
├── site-docs/               # Documentation site documentation
│   ├── ARCHITECTURE.md      # Build system architecture
│   ├── CONTRIBUTING.md      # Contribution guide
│   └── REDIRECTS.md         # Redirect system guide
├── astro.config.mjs         # Astro/Starlight configuration
└── package.json
```

## Contributing

**Content changes** must be made in the [Pepr core repository](https://github.com/defenseunicorns/pepr). Site structure and UI changes should be made in this repository.

See [site-docs/CONTRIBUTING.md](site-docs/CONTRIBUTING.md) for full guidelines.

## Documentation

- [ARCHITECTURE.md](site-docs/ARCHITECTURE.md) - Build system architecture and workflow
- [CONTRIBUTING.md](site-docs/CONTRIBUTING.md) - Contribution guidelines and testing
- [REDIRECTS.md](site-docs/REDIRECTS.md) - Redirect system documentation

## Support

- **Issues**: [GitHub Issues](https://github.com/defenseunicorns/pepr-docs/issues)
- **Pepr Core**: [GitHub](https://github.com/defenseunicorns/pepr)
- **Community**: [Defense Unicorns Community](https://github.com/defenseunicorns/pepr/discussions)

## License

See the main [Pepr repository](https://github.com/defenseunicorns/pepr) for license information.
