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
    languageOptions: { globals: globals.browser, parserOptions: { project: './tsconfig.json' } },
  },

  importPlugin.flatConfigs.recommended,

  ...addNameToEachConfig('react', [
    ...compat.config(react.configs.recommended),
    {
      rules: {
        'react/react-in-jsx-scope': 'off',
      },
    },
  ]),

  ...addNameToEachConfig('next/core-web-vitals', compat.config(next.configs['core-web-vitals'])),

  ...addNameToEachConfig(
    'ts',
    tseslint.config(js.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic, {
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', caughtErrors: 'none' },
        ],
      },
    }),
  ),

  ...addNameToEachConfig('prettier', compat.extends('prettier')),

  {
    name: 'ai-escape-room-rules',
    rules: {
      'capitalized-comments': ['warn', 'always', { ignoreConsecutiveComments: true }],
      'import/order': [
        'error',
        {
          alphabetize: { order: 'asc', orderImportKind: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
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
