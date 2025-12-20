import * as path from "node:path";
import { transformContent } from "./transform-content.mjs";

// Content link transformations
// Note: /pepr-tutorials/ mapping is for backward compatibility with v0.55.6
// Once v0.55.6 is retired, the pepr-tutorials mapping can be removed
const LINK_MAPPINGS = {
  "](/pepr-tutorials/": "](/tutorials/",
  "](/best-practices/": "](/reference/best-practices/",
  "](/module-examples/": "](/reference/module-examples/",
  "](/faq/": "](/reference/faq/",
  "](/user-guide/actions/": "](/actions/",
};

/**
 * Apply content transformations and link fixes
 * @param {string} content - The markdown content to process
 * @param {string} file - The file path being processed
 * @returns {string} Content with processed links
 */
export function processContentLinks(content, file) {
  let result = transformContent(content);

  // Adjust relative links for non-README files
  if (path.basename(file) !== "README.md") {
    result = result.replaceAll("](../", "](../../").replaceAll("](./", "](../");
  }

  // Apply all link mappings and cleanup
  result = Object.entries(LINK_MAPPINGS).reduce(
    (acc, [old, new_]) => acc.replaceAll(old, new_),
    result,
  );

  // Strip .md extension only from internal links (not external URLs)
  // Match ](non-http-url.md) and ](non-http-url.md#anchor)
  result = result.replace(/\]\((?!https?:\/\/)([^)]+)\.md(#[^)]+)?\)/g, (match, url, anchor) => {
    return `](${url}${anchor || ""})`;
  });

  return result;
}
