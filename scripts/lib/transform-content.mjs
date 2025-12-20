import { fixImagePaths } from "./fix-image-paths.mjs";
import { removeHtmlComments } from "./remove-html-comments.mjs";

/**
 * Content transformation pipeline - all transformations in one place
 * @param {string} content - The markdown content to transform
 * @returns {string} Transformed content
 */
export function transformContent(content) {
  // 1. Fix image paths
  let result = fixImagePaths(content);

  // 2. Convert video links (only bare URLs, not those already in video tags)
  result = result.replace(
    /(?<!src=")https[\S]*\.mp4(?!")/g,
    url => `<video class="td-content" controls src="${url}"></video>`,
  );

  // 3. Process markdown links (basic transformations)
  const ROOT_FILE_MAPPINGS = {
    "code-of-conduct.md": "code-of-conduct.md",
    "security.md": "security.md",
    "support.md": "support.md",
  };

  result = result.replace(/\]\(([^)]+)\)/g, (match, url) => {
    // Skip external URLs
    if (url.startsWith("http")) return match;

    let parts = url.split("/");

    // Handle root-level files that get copied to subdirectories
    if (parts[0] === ".." && parts[1] === ".." && parts[2]) {
      const fileName = parts[2].toLowerCase();
      if (ROOT_FILE_MAPPINGS[fileName]) {
        parts = [".", ROOT_FILE_MAPPINGS[fileName]];
      }
    }

    // Remove README.md from end
    if (parts[parts.length - 1] === "README.md") parts.pop();

    // Handle _images paths
    if (parts[0]?.startsWith("_images")) parts[0] = "__images";

    // Strip docs/ prefix (handle ./docs/, /docs/, or docs/)
    if (parts[0] === "." && parts[1] === "docs") {
      parts.splice(0, 2);
    } else if (parts[0] === "" && parts[1] === "docs") {
      parts.splice(0, 2);
      parts.unshift(""); // Maintain leading slash
    } else if (parts[0] === "docs") {
      parts.shift();
    }

    // Strip .md extension from last part
    const lastIdx = parts.length - 1;
    if (parts[lastIdx]?.endsWith(".md")) {
      parts[lastIdx] = parts[lastIdx].slice(0, -3);
    }

    return `](${parts.join("/").toLowerCase()})`;
  });

  // 4. Escape MDX content
  return removeHtmlComments(result)
    .replaceAll(/\*\*@param\b/g, "**\\@param")
    .replace(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g, "&lt;$1&gt;")
    .replace(/<([^>]*[@!][^>]*)>/g, "&lt;$1&gt;");
}
