import fs from "node:fs";

// Dynamically generate examples sidebar by scanning the examples directory
export function generateExamplesSidebarItems(examplesDir = "./src/content/docs/examples") {
  if (!fs.existsSync(examplesDir)) {
    throw new Error(
      `Examples directory not found at '${examplesDir}'. Run 'npm run build' first to generate content.`,
    );
  }

  const items = [];
  const entries = fs.readdirSync(examplesDir, { withFileTypes: true });

  const directories = entries
    .filter(entry => entry.isDirectory())
    .map(dir => dir.name)
    .sort();

  const files = entries
    .filter(entry => entry.isFile() && entry.name.endsWith(".md"))
    .map(file => file.name.replace(/\.md$/, ""))
    .sort();

  for (const dir of directories) {
    const label = dir
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    items.push({
      label,
      autogenerate: { directory: `examples/${dir}` },
    });
  }

  for (const file of files) {
    const label = file
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    items.push({
      label,
      link: `examples/${file}`,
    });
  }

  return items;
}
