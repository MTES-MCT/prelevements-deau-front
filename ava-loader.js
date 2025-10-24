/**
 * Custom loader for AVA to resolve path aliases
 * Resolves @/ to ./src/
 */

import {pathToFileURL} from 'node:url'

const baseURL = pathToFileURL(process.cwd() + '/').href

export async function resolve(specifier, context, nextResolve) {
  // Handle @/ alias
  if (specifier.startsWith('@/')) {
    const resolved = specifier.replace('@/', './src/')
    const resolvedURL = new URL(resolved, baseURL).href
    return nextResolve(resolvedURL, context)
  }

  // Default resolution
  return nextResolve(specifier, context)
}
