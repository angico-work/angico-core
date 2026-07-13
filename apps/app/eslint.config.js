import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['coverage', 'dist', 'playwright-report', 'test-results']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/set-state-in-effect': 'off'
    }
  },
  {
    files: ['src/pages/MensagensPage.tsx'],
    rules: {
      'react-hooks/refs': 'off'
    }
  }
);
