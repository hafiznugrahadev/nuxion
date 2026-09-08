// Flat ESLint config for the whole monorepo (ESLint 9).
// Lenient by design: it guards against real mistakes without fighting the
// existing NestJS-decorator / Nuxt-auto-import style. TypeScript itself handles
// type errors (see `bun run typecheck`), so we keep type-unaware rules here.
import js from '@eslint/js';
import ts from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';

export default ts.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/.nuxt/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/generated/**',
      'apps/api/prisma/migrations/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: ts.parser },
    },
  },
  {
    rules: {
      // TS handles undefined identifiers + Nuxt/Nest provide many globals.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Single-word component/page/layout filenames are idiomatic in Nuxt.
      'vue/multi-word-component-names': 'off',
    },
  },
);
