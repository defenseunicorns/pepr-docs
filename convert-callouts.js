#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to recursively find all .md and .mdx files
function findMarkdownFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

// Function to convert GitHub callouts to MDX admonitions
function convertCallouts(content) {
  // Pattern to match GitHub-style callouts
  const calloutPattern = /^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]\n((?:^>.*\n?)*)/gm;

  return content.replace(calloutPattern, (match, type, content) => {
    const mdxType = type.toLowerCase();

    // Remove the '> ' prefix from each line and clean up
    const cleanContent = content
      .split('\n')
      .map(line => line.replace(/^> ?/, ''))
      .filter(line => line.length > 0)
      .join('\n');

    console.log(`  Converting ${type} callout to MDX admonition`);
    return `:::${mdxType}\n${cleanContent}\n:::`;
  });
}

// Main execution
function main() {
  const contentDir = path.join(__dirname, 'src', 'content');

  if (!fs.existsSync(contentDir)) {
    console.log('Content directory not found, skipping callout conversion');
    return;
  }

  console.log('Converting GitHub callouts to MDX admonitions...');

  const markdownFiles = findMarkdownFiles(contentDir);
  let totalConversions = 0;

  for (const filePath of markdownFiles) {
    const content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('> [!')) {
      console.log(`Processing: ${path.relative(__dirname, filePath)}`);
      const convertedContent = convertCallouts(content);

      if (convertedContent !== content) {
        fs.writeFileSync(filePath, convertedContent, 'utf8');
        totalConversions++;
      }
    }
  }

  console.log(`Completed! Processed ${totalConversions} files with callout conversions.`);
}

main();