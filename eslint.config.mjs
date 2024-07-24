import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  eslintPluginUnicorn.configs['flat/recommended'],
  {
    rules: {
      'unicorn/prevent-abbreviations': 0,
      '@typescript-eslint/consistent-type-exports': 'error',
    },
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
