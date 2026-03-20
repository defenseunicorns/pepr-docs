import * as path from "node:path";

// Directory restructuring rules for organizing content into logical sections
export const PATH_MAPPINGS = {
  structure: { "pepr-tutorials": "tutorials", "user-guide/actions": "actions" },
  singleFile: {
    "best-practices": "reference/best-practices.md",
    "module-examples": "reference/module-examples.md",
    faq: "reference/faq.md",
    roadmap: "roadmap.md",
  },
};

// Generate new file path for a source file
export const generateFileMetadata = file => {
  const [dir, filename] = [path.dirname(file), path.basename(file)];
  const parts = dir.split("/");
  const parent = parts.pop();
  const ancestors = parts.join("/");

  let rawdir = ancestors ? `${ancestors}/${parent}` : parent;

  // Apply structure mappings
  let newdir = Object.entries(PATH_MAPPINGS.structure).reduce(
    (dir, [old, new_]) => (dir.startsWith(old) ? dir.replace(old, new_) : dir),
    rawdir,
  );

  let newfile = filename;
  if (newfile === "README.md") {
    newfile = "index.md";
  }

  // Handle single file mappings
  if (newfile === "index.md" && PATH_MAPPINGS.singleFile[rawdir]) {
    [newdir, newfile] = ["", PATH_MAPPINGS.singleFile[rawdir]];
  }

  return { newfile: newdir && newdir !== "." ? `${newdir}/${newfile}` : newfile };
};
