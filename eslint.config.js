import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `archived/` is retired code kept for reference only — it is not built or shipped, so linting it
  // just produced permanent noise.
  globalIgnores(['dist', '.worktrees', 'archived']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // These rules are stylistic or too strict for our current codebase and flag common, safe
      // patterns. Keep core correctness rules, but avoid blocking work on large refactors.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/unsupported-syntax': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'warn',

      // NOT optional. This rule was previously disabled, which hid a real crash in ComicCanvas:
      // an early return sat above eight hook calls, so unloading the last page made React render
      // fewer hooks than the previous pass ("Rendered fewer hooks than expected"). Conditional
      // hooks are always a bug, never a style preference — leave this on.
      'react-hooks/rules-of-hooks': 'error',

      // Leading underscore is the codebase's existing convention for deliberately-unused bindings
      // (omit-by-destructuring, placeholder params that keep a shared signature). Encode it here
      // instead of leaving each site as a standing warning.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
])
