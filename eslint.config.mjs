// @ts-check

import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';

// The Next plugin's exported config types don't line up perfectly with FlatConfig typing under @ts-check.
// Cast to `any` so VS Code doesn't flag the spread in the `rules` object.
const nextRecommendedRules = /** @type {any} */ (nextPlugin.configs.recommended?.rules ?? {});
const nextCoreWebVitalsRules = /** @type {any} */ (nextPlugin.configs['core-web-vitals']?.rules ?? {});

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
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextRecommendedRules,
      ...nextCoreWebVitalsRules,
      '@next/next/no-img-element': 'off',
    },
  },
  {
    // Next.js + TS files
    files: ['**/*.ts', '**/*.tsx', '**/*.mjs', '**/*.js', '**/*.jsx'],
    rules: {
      // Your other Next.js rules can go here
    },
  },
  {
    // Override for Next.js generated env declaration
    files: ['next-env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
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
    files: ['scripts/**/*.{js,ts,mjs}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
