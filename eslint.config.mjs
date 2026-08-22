import js from '@eslint/js'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import tseslint from 'typescript-eslint'

/**
 * Type-aware linting is pillar one of the zero-defect posture in the bootstrap
 * brief §1.2 — it is the reason TypeScript is pinned to 6.0.3 rather than the
 * newer 7.0.2 (see docs/PLAN-M1.md §2.1: typescript-eslint declares
 * `typescript: ">=4.8.4 <6.1.0"`).
 *
 * Rules are not disabled to make CI pass. If a rule fires, either the code is
 * wrong or the rule needs a discussion — bootstrap brief §1.3.
 */
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'public/sw.js',
      'supabase/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...nextCoreWebVitals,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      /*
       * `any` is banned and enforced by lint — bootstrap brief §1.2.
       * strictTypeChecked already errors on these; restated so that anyone
       * reading this file can see the rule rather than infer it from a preset.
       */
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      /*
       * A floating promise in an offline sync engine is a silently dropped
       * mutation — see docs/PLAN-M1.md §6. This one earns its keep.
       */
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      /*
       * No @ts-ignore or @ts-expect-error without an explanation — bootstrap
       * brief §1.2. `ts-expect-error` is allowed with a description because it
       * fails loudly once the underlying issue is fixed; `ts-ignore` never does.
       */
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 20,
        },
      ],

      /* Unused values are usually a half-finished thought. `_`-prefixed is the
         documented escape hatch for deliberately ignored bindings. */
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      /* Money is integer cents (docs/PLAN-M1.md §1.4.1). An accidental `==`
         between a cents number and a string is exactly the class of bug that
         makes a day fail to balance. */
      eqeqeq: ['error', 'always'],
    },
  },

  /* Config files run in Node and are not part of the app's type graph. */
  {
    files: ['*.mjs', '*.js', '*.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
)
