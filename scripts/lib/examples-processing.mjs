// Extract category and title from example README
// Returns: { category: "actions", categoryLabel: "Actions", title: "Mutate" }
// If H1 is "Category: Title" -> category folder is created
// If H1 is just "Title" (no colon) -> stays unnested
export const extractExampleCategory = (content, exampleName) => {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  const fullTitle = headingMatch
    ? headingMatch[1]
    : exampleName.replace(/^hello-pepr-/, "").replace(/-/g, " ");

  // Check if title has a category prefix (e.g., "Action: Mutate")
  const categoryMatch = fullTitle.match(/^([^:]+):\s*(.+)$/);

  if (categoryMatch) {
    const categoryLabel = categoryMatch[1].trim();
    const title = categoryMatch[2].trim();

    // Keep category as lowercase with spaces preserved
    // Directory conversion happens when the path is created
    const category = categoryLabel.toLowerCase();

    return {
      category,
      categoryLabel,
      title,
    };
  }

  // No colon found - this example stays unnested
  return {
    category: "other",
    categoryLabel: "Other",
    title: fullTitle,
  };
};

// Extract and clean title from example README
export const extractExampleTitle = (content, exampleName) => {
  const { title } = extractExampleCategory(content, exampleName);
  return title;
};

// Remove the first heading from content
export const removeHeading = content => {
  const headingMatch = content.match(/^#\s+.+$/m);
  if (headingMatch) {
    return content.replace(/^#\s+.+$/m, "").trim();
  }
  return content;
};

// Generate slug from example name
export const generateExampleSlug = exampleName => {
  // Handle base hello-pepr directory
  if (exampleName === "hello-pepr") {
    return "module";
  }
  // Handle hello-pepr-* directories
  return exampleName.replace(/^hello-pepr-/, "");
};

// Escape double quotes and backslashes for YAML quoted strings
export const escapeYamlString = str => {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
};

// Generate GitHub source URL for example
export const generateExampleSourceUrl = exampleName => {
  return `https://github.com/defenseunicorns/pepr-excellent-examples/tree/main/${exampleName}`;
};
