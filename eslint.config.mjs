import { recommended } from '@defenseunicorns/eslint-config';

export default [
  ...recommended,
  {
    ignores: ['node_modules', 'site'],
  },
];