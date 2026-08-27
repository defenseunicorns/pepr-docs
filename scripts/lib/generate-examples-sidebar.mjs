import fs from "node:fs";
import path from "node:path";

const markdownLabelCache = new Map();

function toTitleCase(value) {
  return value
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function stripYamlScalar(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function readMarkdownLabel(filePath) {
  if (markdownLabelCache.has(filePath)) {
    return markdownLabelCache.get(filePath);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const titleMatch = frontmatter.match(/^title:\s*(.+)$/m);

    if (titleMatch) {
      const title = stripYamlScalar(titleMatch[1]);
      markdownLabelCache.set(filePath, title);
      return title;
    }
  }

  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    const label = headingMatch[1].replaceAll(/[`:]/g, "");
    markdownLabelCache.set(filePath, label);
    return label;
  }

  throw new Error(`Missing title or heading in '${filePath}'.`);
}

function createLinkItem(baseSlug, filePath) {
  const fileSlug = path.basename(filePath, ".md");
  const slug = fileSlug === "index" ? baseSlug : `${baseSlug}/${fileSlug}`;

  return {
    label: readMarkdownLabel(filePath),
    link: slug,
  };
}

function generateSidebarItemsForDir(dir, baseSlug) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory not found at '${dir}'.`);
  }

  const items = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const directories = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  const files = entries
    .filter(entry => entry.isFile() && entry.name.endsWith(".md"))
    .map(entry => entry.name)
    .sort();

  for (const directory of directories) {
    const childDir = path.join(dir, directory);
    const childSlug = `${baseSlug}/${directory}`;
    const childItems = generateSidebarItemsForDir(childDir, childSlug);

    if (childItems.length > 0) {
      items.push({
        label: toTitleCase(directory),
        items: childItems,
      });
    }
  }

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file === "index.md") {
      items.unshift(createLinkItem(baseSlug, filePath));
    } else {
      items.push(createLinkItem(baseSlug, filePath));
    }
  }

  return items;
}

export function generateSidebarItems(dir, baseSlug) {
  return generateSidebarItemsForDir(dir, baseSlug);
}

// Dynamically generate examples sidebar by scanning the examples directory
export function generateExamplesSidebarItems(examplesDir = "./src/content/docs/examples") {
  return generateSidebarItems(examplesDir, "examples");
}
