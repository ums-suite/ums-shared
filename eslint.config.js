// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '.angular/**',
      '**/*.generated.ts',
      // The OpenAPI-generator output is third-party-generated code (see
      // projects/shared/src/lib/api/generated/README.md) -- committed for reproducible builds but
      // never hand-edited, so it is never linted like hand-authored source either.
      'projects/shared/src/lib/api/generated/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strict,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
      eslintConfigPrettier,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: ['ums'], style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['ums'], style: 'kebab-case' },
      ],
    },
  },
  {
    // Plain-Node build/codegen scripts (scripts/) -- not part of the Angular TypeScript project,
    // so plain (non-type-aware) JS linting only.
    files: ['**/*.mjs', '**/*.cjs', '**/*.js'],
    extends: [eslint.configs.recommended, eslintConfigPrettier],
    languageOptions: {
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        fetch: 'readonly',
      },
    },
  },
);
