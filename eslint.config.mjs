
// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
      // config with just ignores is the replacement for `.eslintignore`
      ignores: ['**/build/**', '**/dist/**', "/node_modules/", ".next", ".vscode", "scratchfiles", 'src/some/file/to/ignore.ts'],
    },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  // ...
);