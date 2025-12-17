/**
 * Shared test utilities for CORE and EXAMPLES processing tests
 */

// Re-export heredoc from the build utilities
export { heredoc } from "../lib/heredoc.mjs";

/**
 * Escapes special characters in YAML strings
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for YAML
 */
export function escapeYamlString(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
