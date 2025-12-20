/**
 * Helper to remove HTML comments repeatedly until none remain
 * @param {string} input - The content to process
 * @returns {string} Content with all HTML comments removed
 */
export function removeHtmlComments(input) {
  let prev;
  do {
    prev = input;
    input = input.replace(/<!--([\s\S]*?)-->/g, "");
  } while (input !== prev);
  return input;
}
