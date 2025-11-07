import { recommended } from "@defenseunicorns/eslint-config";

export default [
  ...recommended,
  {
    ignores: [
      "node_modules",
      "dist",
      "work",
      ".astro",
      "src/content/docs",
      "src/content/versions",
      "site",
    ],
  },
];
