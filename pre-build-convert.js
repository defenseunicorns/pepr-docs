#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to convert GitHub callouts and escape problematic exclamation marks
function convertCallouts(content) {
  let processedContent = content;

  // First, handle GitHub-style callouts
  const calloutPattern = /^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]\n((?:^>.*\n?)*)/gm;
  processedContent = processedContent.replace(calloutPattern, (match, type, calloutContent) => {
    const mdxType = type.toLowerCase();

    // Remove the '> ' prefix from each line and clean up
    const cleanContent = calloutContent
      .split('\n')
      .map(line => line.replace(/^> ?/, ''))
      .filter(line => line.length > 0)
      .join('\n');

    console.log(`Pre-build: Converting ${type} callout to MDX admonition`);
    return `:::${mdxType}\n${cleanContent}\n:::`;
  });

  // Escape other problematic exclamation marks that might cause MDX issues
  // Look for standalone exclamation marks that could be interpreted as invalid HTML tags
  processedContent = processedContent.replace(
    /!\[(?![^\]]*\]\([^)]*\))/g, // Negative lookahead to avoid breaking image syntax
    '\\!'
  );

  // Handle any remaining edge cases with exclamation marks in angle brackets
  processedContent = processedContent.replace(
    /<([^>]*!)([^>]*)>/g,
    (match, before, after) => {
      // If this looks like a valid HTML tag, leave it alone
      if (/^[a-zA-Z][a-zA-Z0-9]*(\s|$)/.test(before + after)) {
        return match;
      }
      // Otherwise, escape the exclamation mark
      return `&lt;${before}!${after}&gt;`;
    }
  );

  return processedContent;
}

// Main execution
async function main() {
  const contentDir = path.join(__dirname, 'src', 'content');

  if (!fs.existsSync(contentDir)) {
    console.log('Content directory not found, skipping callout conversion');
    return;
  }

  console.log('Pre-build: Converting GitHub callouts to MDX admonitions...');

  // Find all markdown files
  const markdownFiles = await glob('**/*.{md,mdx}', {
    cwd: contentDir,
    absolute: true
  });

  let totalConversions = 0;

  for (const filePath of markdownFiles) {
    const content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('> [!')) {
      console.log(`Pre-build: Processing ${path.relative(__dirname, filePath)}`);
      const convertedContent = convertCallouts(content);

      if (convertedContent !== content) {
        fs.writeFileSync(filePath, convertedContent, 'utf8');
        totalConversions++;
      }
    }
  }

  console.log(`Pre-build: Completed! Processed ${totalConversions} files with callout conversions.`);
}

main().catch(console.error);