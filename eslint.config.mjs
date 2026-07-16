// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['eslint.config.mjs', 'dist/**', 'src/database/seeds/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            sourceType: 'commonjs',
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['src/*'],
                            message:
                                "Use a relative import instead of the 'src/' path alias — the TypeORM CLI (migrations, seeds) doesn't resolve tsconfig path mappings and will fail at runtime.",
                        },
                    ],
                },
            ],
            // strict typing — catches implicit `any` leaking through DTOs, repo results, req.user
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unsafe-argument': 'error',
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',

            // async correctness — the class of bug that turned into your 500s
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/promise-function-async': 'error',

            // forces every service/controller method to declare its return type —
            // makes a TokenPair vs Promise<void> mismatch a compile-time error, not a 500
            '@typescript-eslint/explicit-function-return-type': [
                'error',
                { allowExpressions: true },
            ],

            // hygiene
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-non-null-assertion': 'error', // `!` hides the exact null-check bugs you're supposed to be learning to handle
            '@typescript-eslint/consistent-type-imports': 'error', // import type { X } — keeps compiled output lean
            '@typescript-eslint/switch-exhaustiveness-check': 'error', // will matter a lot once Post has a discriminator (text/image/video)
            'no-console': 'warn', // Nest's Logger instead

            'prettier/prettier': ['error', { endOfLine: 'auto' }],
        },
    },
);

