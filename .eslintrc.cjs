module.exports = {
  root: true,
  env: {
    node: true,
    es2024: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript specific overrides
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',

    // Import rules
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*.test.ts',
          '**/*.spec.ts',
          '**/tests/**',
          '**/test/**',
          '**/__tests__/**',
          '**/vitest.config.ts',
          '**/vitest.*.config.ts',
          '**/jest.config.ts',
        ],
      },
    ],

    // General code style
    'no-console': 'warn',
    'no-debugger': 'error',
    'class-methods-use-this': 'off',

    // Allow for-of loops (Airbnb disables them)
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
      },
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    'packages/',
    'services/',
    'infrastructure/',
    '*.js',
    '!.eslintrc.cjs',
  ],
  overrides: [
    {
      // Test files
      files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**', '**/__tests__/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
    {
      // Vitest config files
      files: ['**/vitest.config.ts', '**/vitest.*.config.ts'],
      rules: {
        'import/no-unresolved': 'off',
      },
    },
  ],
};
