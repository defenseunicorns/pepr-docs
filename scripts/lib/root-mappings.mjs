// Map community files from repository root to their destination paths in docs
// Needed for backward compatibility with old git tags (v1.0.2, v0.55.6) that still use numbered prefixes
export const ROOT_MD_MAPPINGS = [
  { sources: ["SECURITY.md"], target: "090_community/security.md" },
  { sources: ["CODE-OF-CONDUCT.md"], target: "100_contribute/code-of-conduct.md" },
  { sources: ["SUPPORT.md"], target: "090_community/support.md" },
];
