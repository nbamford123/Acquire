module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:eslint-comments/recommended',
    'plugin:jest/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:mdx/recommended',
    'plugin:prettier/recommended',
  ],
  settings: {
    'mdx/code-blocks': true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    extraFileExtensions: ['.mdx'],
    project: ['tsconfig.json'],
  },
  plugins: [
    '@typescript-eslint',
    'eslint-comments',
    'promise',
    'jest',
    'prettier',
  ],
};
