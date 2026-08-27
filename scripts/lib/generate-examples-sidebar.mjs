import fs from "node:fs";
import path from "node:path";

function toTitleCase(value) {
  return value
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function createLinkItem(baseSlug, fileName) {
  const fileSlug = fileName.replace(/\.md$/, "");
  const slug = fileSlug === "index" ? baseSlug : `${baseSlug}/${fileSlug}`;
  const labelSource = fileSlug === "index" ? path.basename(baseSlug) : fileSlug;

  return {
    label: toTitleCase(labelSource),
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
    if (file === "index.md") {
      items.unshift(createLinkItem(baseSlug, file));
    } else {
      items.push(createLinkItem(baseSlug, file));
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
