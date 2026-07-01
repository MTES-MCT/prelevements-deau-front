/**
 * Custom loader for AVA to resolve path aliases
 * Resolves @/ to ./src/
 */

import {pathToFileURL} from 'node:url'

const baseURL = pathToFileURL(process.cwd() + '/').href
const muiIconStubURL = new URL('src/test/mui-icon-stub.js', baseURL).href

export async function resolve(specifier, context, nextResolve) {
  if (
    process.env.NODE_ENV === 'test'
    && (specifier === '@mui/icons-material' || specifier.startsWith('@mui/icons-material/'))
  ) {
    return {
      url: muiIconStubURL,
      shortCircuit: true
    }
  }

  // Handle @/ alias
  if (specifier.startsWith('@/')) {
    const resolved = specifier.replace('@/', './src/')
    const resolvedURL = new URL(resolved, baseURL).href
    return nextResolve(resolvedURL, context)
  }

  // Default resolution
  return nextResolve(specifier, context)
}
