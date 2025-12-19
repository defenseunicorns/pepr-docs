// Extract and clean title from example README
export const extractExampleTitle = (content, exampleName) => {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  let title = headingMatch
    ? headingMatch[1]
    : exampleName.replace(/^hello-pepr-/, "").replace(/-/g, " ");

  // Remove "Hello Pepr " prefix from title (case-insensitive)
  title = title.replace(/^hello\s+pepr\s+/i, "");

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
