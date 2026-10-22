import {fileURLToPath} from 'node:url'

const config = {
  viteFinal: async config => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {...config.resolve?.alias, '@': fileURLToPath(new URL('../src', import.meta.url))}
    },
    // Preserve the existing DSFR CSS, including its legacy IE media queries.
    // Vite 8 defaults to LightningCSS, which rejects that older syntax.
    build: {...config.build, cssMinify: 'esbuild'}
  }),
  "stories": [
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-docs"
  ],
  "framework": {
    "name": "@storybook/nextjs-vite",
    "options": {}
  },
  "staticDirs": [
    "../public"
  ],
  "docs": {
    "autodocs": "tag"
  }
}

export default config
