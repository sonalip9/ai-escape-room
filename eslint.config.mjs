import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import next from '@next/eslint-plugin-next';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const addNameToEachConfig = (name, configs) =>
  configs.map((conf) => ({
    ...conf,
    name: [conf.name, name].filter(Boolean).join('-'),
  }));

const eslintConfig = [
  {
    name: 'ai-escape-room-files',
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', 'eslint.config.mjs'],
    languageOptions: { globals: globals.browser },
  },

  importPlugin.flatConfigs.recommended,

  ...addNameToEachConfig('react', [
    ...compat.config(react.configs.recommended),
    {
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/jsx-curly-brace-presence': 'error',
        'react/boolean-prop-naming': 'error',
        'react/button-has-type': 'error',
      },
    },
  ]),

  ...addNameToEachConfig('next/core-web-vitals', compat.config(next.configs['core-web-vitals'])),
  {
    rules: {
      '@next/next/no-img-element': 'error',
      '@next/next/no-head-element': 'error',
    },
  },

  ...addNameToEachConfig(
    'ts',
    tseslint.config(
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      tseslint.configs.strictTypeChecked,
      {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
          parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname,
          },
        },
        rules: {
          '@typescript-eslint/no-unused-vars': [
            'error',
            { argsIgnorePattern: '^_', caughtErrors: 'none' },
          ],

          '@typescript-eslint/consistent-type-exports': 'error',
          '@typescript-eslint/consistent-type-imports': 'error',
          '@typescript-eslint/default-param-last': 'warn',
          '@typescript-eslint/switch-exhaustiveness-check': 'error',
          '@typescript-eslint/strict-boolean-expressions': 'warn',
          '@typescript-eslint/promise-function-async': 'warn',
          '@typescript-eslint/prefer-destructuring': 'error',
          '@typescript-eslint/no-use-before-define': [
            'error',
            { functions: false, classes: true, variables: true },
          ],
          '@typescript-eslint/no-shadow': 'error',
          '@typescript-eslint/explicit-function-return-type': 'error',
        },
      },
    ),
  ),

  ...addNameToEachConfig('prettier', compat.extends('prettier')),

  {
    name: 'ai-escape-room-rules',
    rules: {
      'capitalized-comments': ['warn', 'always', { ignoreConsecutiveComments: true }],
      eqeqeq: 'error',

      'import/order': [
        'error',
        {
          alphabetize: { order: 'asc', orderImportKind: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
      'import/first': 'error',
      'import/no-relative-packages': 'warn',
      'import/no-mutable-exports': 'warn',
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
  },
];

export default eslintConfig;
