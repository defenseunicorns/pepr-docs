# Redirect Generation System

This document explains how the redirect generation system works and how to add manual redirects.

## Overview

The redirect generation system has been refactored into a dedicated module (`build/redirects-generator.mjs`) that generates all redirects in the Netlify `_redirects` file.

## How It Works

The system generates three types of redirects in priority order (Netlify processes redirects top-to-bottom, using the first match):

1. **Manual Redirects** (Highest Priority)
   - Specific path redirects and fixes
   - Defined in `MANUAL_REDIRECTS` object in `build/redirects-generator.mjs`
   - Most specific rules should go here

2. **Patch-to-Minor Redirects** (Medium Priority)
   - Automatically generated for all patch versions of **active (non-retired)** releases only
   - Two rules per patch version:
     - Exact: `/v0.54.0` → `/v0.54`
     - Wildcard: `/v0.54.0/*` → `/v0.54/:splat`
   - The header in `_redirects` shows which versions are active (e.g., "v0.54, v0.55")

3. **Retired Version Redirects** (Lowest Priority - Catch-All)
   - Automatically generated for all retired major.minor versions
   - Broad wildcard rules that catch any remaining traffic
   - Example: `/v0.53/*` → `/:splat`

## Adding Manual Redirects

To add a new redirect, edit `build/redirects-generator.mjs` and add an entry to the `MANUAL_REDIRECTS` object:

```javascript
const MANUAL_REDIRECTS = {
	// Your custom redirects here
	'/old-path': '/new-path',
	'/another-old-path': '/another-new-path',
	
	// Existing redirects...
	'/main/*': '/:splat',
	'/latest/*': '/:splat',
	// ...
};
```

### Redirect Format

- Keys are the source paths (what the user visits)
- Values are the destination paths (where they should be redirected)
- Wildcards are automatically appended:
  - Source: `/*` is added if not present
  - Destination: `/:splat` is added if not present
  
### Examples

```javascript
// Simple redirect
'/old-page': '/new-page'
// Becomes: /old-page/* → /new-page/:splat

// Version-specific redirects
'/v0.54/old-path': '/v0.54/new-path'

// Structural changes
'/v0.54.0/user-guide/actions': '/v0.54/actions'
```

## Why This Approach?

### Benefits

1. **Centralized Configuration**: All redirects in one place
2. **Automatic Patch Redirects**: No manual updates needed for new patch versions
3. **Clear Priority**: Specific redirects take precedence over wildcards
4. **Easy Maintenance**: Simple object structure for manual redirects

### What Gets Auto-Generated

- Retired version redirects (from build state)
- Patch-to-minor redirects (from git tags)

### What Needs Manual Configuration

- Structural changes (e.g., `/actions/` moved from `/user-guide/actions/`)
- Path fixes (e.g., underscore vs hyphen)
- One-off 404 fixes
- Cross-version redirects

## File Locations

- **Generator Module**: `build/redirects-generator.mjs`
- **Build Script**: `build/index.mjs` (calls the generator)
- **Output File**: `public/_redirects` (Netlify format)

## Testing

To test your redirects:

1. Add your redirect to `MANUAL_REDIRECTS` in `build/redirects-generator.mjs`
2. Run the full build:
   ```bash
   export CORE="/path/to/pepr/pepr"
   node build/index.mjs --core "$CORE" --site ./src/content/docs
   npm run build
   ```
3. Check `public/_redirects` to verify your redirect was generated
4. Test locally with Netlify dev:
   ```bash
   netlify dev
   ```
   Visit http://localhost:8888 and test your redirect
5. Deploy and test on Netlify
