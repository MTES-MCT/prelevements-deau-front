/* Utility helpers to build and parse the “enriched” HTTP errors that
   we serialise into `Error.message` so they can cross the Next.js
   boundary. */

/**
 * Create an Error carrying a serialised payload with HTTP metadata.
 *
 * @param {Object} params
 * @param {number} params.status   – HTTP status code (e.g. 404)
 * @param {string|number} [params.code=params.status] – Business‑level error code
 * @param {string} [params.message] – Human readable message
 * @param {any} [params.details]   – Arbitrary extra info for debugging/UI
 * @returns {Error} The enriched Error instance ready to be thrown
 */
export function createHttpError({status, code = status, message = '', details} = {}) {
  if (!status) {
    throw new Error('createHttpError: “status” is required')
  }

  const payload = {
    status, code, message, details
  }
  const err = new Error(JSON.stringify(payload))
  err.status = status // Keep compatibility with conventional handlers
  return err
}

/**
 * Extract the payload embedded by `createHttpError`.
 *
 * Always returns a normalised object so components can rely on the shape.
 *
 * @param {Error} error  – The error caught in a Route Handler / Error Boundary
 * @returns {{status:number, code:number|string, message:string, details:any}}
 */
export function parseHttpError(error) {
  let status = 500
  let code = 500
  let message = 'Erreur inattendue'
  let details

  // First try to decode our serialised payload
  try {
    const parsed = JSON.parse(error?.message ?? '{}')
    status = parsed.status ?? status
    code = parsed.code ?? status
    message = parsed.message ?? message
    details = parsed.details
  } catch {
    // Otherwise fall back to conventional props
    status = error?.status ?? status
    code = error?.code ?? status
    message = error?.message ?? message
  }

  return {
    status, code, message, details
  }
}
