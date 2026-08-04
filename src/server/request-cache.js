import * as React from 'react'

/**
 * Next.js exposes React.cache while rendering Server Components, even though
 * the React 18 package used by standalone unit tests does not. Falling back to
 * the original function keeps those non-RSC call sites functional.
 */
export function cachePerRequest(fn) {
  return typeof React.cache === 'function' ? React.cache(fn) : fn
}
