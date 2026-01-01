// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Files/folders to ignore
    ignores: [
      '**/build/**',
      '**/dist/**',
      'node_modules/',
      '.next/',
      '.vscode/',
      'scratchfiles/',
      'src/some/file/to/ignore.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Next.js + TS files
    files: ['**/*.ts', '**/*.tsx', '**/*.mjs', '**/*.js', '**/*.jsx'],
    rules: {
      // Your other Next.js rules can go here
    },
  },
  {
    // Override for generated Next.js routes file
    files: ['./.next/types/routes.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    files: ["scripts/**/*.{js,ts,mjs}"],
    rules: {
      "no-console": "off",
    },
  },
);