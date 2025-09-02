#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const convertHugoToStarlight = (hugoFile, starlightDir) => {
  try {
    const content = fs.readFileSync(hugoFile, 'utf8');
    const { data, content: body } = matter(content);
    
    console.log(`📄 Processing: ${hugoFile}`);
    console.log(`📋 Frontmatter:`, JSON.stringify(data, null, 2));
    
    // Build clean frontmatter object (only include defined values)
    const converted = {};
    
    if (data.title) converted.title = data.title;
    if (data.description) converted.description = data.description;
    if (data.summary && !data.description) converted.description = data.summary;
    
    // Fallback title if none exists
    if (!converted.title) {
      const filename = path.basename(hugoFile, '.md');
      converted.title = filename === '_index' ? 'Documentation' : filename.replace(/-/g, ' ');
    }
    
    console.log(`✨ Converted frontmatter:`, JSON.stringify(converted, null, 2));
    
    // Convert Hugo shortcodes to Starlight components
    let convertedBody = body
      .replace(/\{\{< alert >\}\}(.*?)\{\{< \/alert >\}\}/gs, ':::note\n$1\n:::')
      .replace(/\{\{< warning >\}\}(.*?)\{\{< \/warning >\}\}/gs, ':::caution\n$1\n:::')
      .replace(/\{\{< info >\}\}(.*?)\{\{< \/info >\}\}/gs, ':::tip\n$1\n:::')
      .replace(/\{\{< code >\}\}(.*?)\{\{< \/code >\}\}/gs, '```\n$1\n```');

    // Generate output path
    const relativePath = path.relative('../site/content/en/', hugoFile);
    const starlightFile = path.join(starlightDir, relativePath.replace(/\.md$/, '.mdx'));
    
    // Ensure directory exists
    const outputDir = path.dirname(starlightFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the file
    const finalContent = matter.stringify(convertedBody, converted);
    fs.writeFileSync(starlightFile, finalContent);
    console.log(`✅ Migrated: ${relativePath} → ${path.relative('.', starlightFile)}`);
    
  } catch (error) {
    console.error(`❌ Error processing ${hugoFile}:`, error.message);
  }
};

// Find Hugo content directories
const siteContentDir = '../site/content/en/';
const starlightContentDir = './src/content/docs/';

console.log('🔍 Looking for Hugo content...');
if (!fs.existsSync(siteContentDir)) {
  console.error('❌ Site content directory not found:', siteContentDir);
  process.exit(1);
}

console.log('📁 Available directories:');
const dirs = fs.readdirSync(siteContentDir);
console.log(dirs);

// Process all markdown files in the main directory first
const mainDir = path.join(siteContentDir, 'main');
if (fs.existsSync(mainDir)) {
  console.log('🚀 Processing main directory...');
  const files = fs.readdirSync(mainDir, { recursive: true })
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(mainDir, file));
  
  files.forEach(file => {
    convertHugoToStarlight(file, starlightContentDir);
  });
  
  console.log(`🎉 Processed ${files.length} files from main directory`);
} else {
  console.log('⚠️  No main directory found, processing root files...');
  // Process files in root of content/en/
  const files = fs.readdirSync(siteContentDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(siteContentDir, file));
  
  files.forEach(file => {
    convertHugoToStarlight(file, starlightContentDir);
  });
}