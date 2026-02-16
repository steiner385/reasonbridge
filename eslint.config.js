import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Global ignores (replaces .eslintignore and ignorePatterns)
  {
    ignores: [
      // Build outputs
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/out/**',

      // Dependencies
      '**/node_modules/**',

      // Test coverage
      '**/coverage/**',

      // IDE and editor files
      '**/.idea/**',
      '**/.vscode/**',

      // Generated files
      '**/*.generated.ts',
      '**/*.generated.js',

      // Config files (non-TypeScript JS files)
      '*.config.js',
      '*.config.mjs',
      '!eslint.config.js',

      // Spec files
      'specs/**',

      // Infrastructure as code
      'infrastructure/cdk/**',
      'infrastructure/helm/**',
      'infrastructure/**',

      // Lock files
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',

      // Workspaces linted separately
      'packages/**',
      'services/**',
      'frontend/**',

      // k6 load tests (use k6 globals, not Node.js)
      'load-tests/**',

      // Scripts (shell/helper scripts)
      'scripts/**',

      // E2E tests (handled by frontend)
      'e2e/**',

      // Legacy config files
      '.eslintrc.cjs',
    ],
  },

  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript configuration for .ts files at root
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // TypeScript recommended rules
      ...typescript.configs.recommended.rules,

      // TypeScript specific overrides
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',

      // General code style (from airbnb-base)
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],

      // Allow for-of loops (Airbnb disables them, we allow)
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message:
            'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
        },
        {
          selector: 'LabeledStatement',
          message:
            'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
        },
        {
          selector: 'WithStatement',
          message:
            '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
        },
      ],
    },
  },

  // Vitest config files - relaxed rules
  {
    files: ['vitest.config.ts', 'vitest.*.config.ts', 'vitest.workspace.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Prettier - must be last to override other formatting rules
  prettier,
];
