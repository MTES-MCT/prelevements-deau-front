import js from '@eslint/js'
import next from '@next/eslint-plugin-next'
import stylistic from '@stylistic/eslint-plugin'
import hooks from 'eslint-plugin-react-hooks'
import react from 'eslint-plugin-react-x'
import dom from 'eslint-plugin-react-dom'
import jsx from 'eslint-plugin-react-jsx'
import globals from 'globals'

export default [
  {ignores: ['node_modules/**', '.next/**', '.artifacts/**', 'storybook-static/**', 'public/**']},
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      globals: {...globals.browser, ...globals.node},
      parserOptions: {ecmaFeatures: {jsx: true}}
    },
    plugins: {'@stylistic': stylistic, '@next/next': next, 'react-hooks': hooks, 'react-x': react, 'react-dom': dom, 'react-jsx': jsx},
    settings: {'react-x': {version: 'detect'}},
    rules: {
      ...js.configs.recommended.rules,
      ...next.configs.recommended.rules,
      ...dom.configs.recommended.rules,
      ...jsx.configs.recommended.rules,
      // Keep React correctness checks without opting into React Compiler rules.
      'react-x/no-missing-key': 'error',
      'react-x/no-direct-mutation-state': 'error',
      'react-x/no-access-state-in-setstate': 'error',
      'react-x/no-create-ref': 'error',
      'react-x/no-nested-lazy-component-declarations': 'error',
      'react-dom/no-unknown-property': 'error',
      'no-unused-vars': ['error', {ignoreRestSiblings: true}],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@stylistic/indent': ['error', 2, {SwitchCase: 1}],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/quotes': ['error', 'single', {avoidEscape: true}],
      '@stylistic/jsx-quotes': ['error', 'prefer-single'],
      '@stylistic/no-trailing-spaces': 'error'
    }
  }
]
