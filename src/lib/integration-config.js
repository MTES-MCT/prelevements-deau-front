const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const INLINE_SCRIPT_ESCAPE_CHARACTERS = {
  '&': '\\u0026',
  '<': '\\u003c',
  '>': '\\u003e',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
}

function normalizeMatomoUrl(value) {
  const candidate = value?.trim()

  if (!candidate) {
    return ''
  }

  try {
    const parsedUrl = new URL(candidate)

    if (!['http:', 'https:'].includes(parsedUrl.protocol)
      || parsedUrl.username
      || parsedUrl.password
      || parsedUrl.search
      || parsedUrl.hash) {
      return ''
    }

    if (!parsedUrl.pathname.endsWith('/')) {
      parsedUrl.pathname += '/'
    }

    return parsedUrl.toString()
  } catch {
    return ''
  }
}

export function isEnvironmentFlagEnabled(value) {
  return TRUE_VALUES.has(value?.trim().toLowerCase())
}

export function resolveMatomoConfig({
  disabled,
  siteId,
  url
} = {}) {
  const normalizedUrl = normalizeMatomoUrl(url)
  const normalizedSiteId = /^\d+$/.test(siteId?.trim() || '')
    ? siteId.trim()
    : ''

  return {
    enabled: !isEnvironmentFlagEnabled(disabled)
      && Boolean(normalizedUrl && normalizedSiteId),
    siteId: normalizedSiteId,
    url: normalizedUrl
  }
}

export function serializeInlineScriptValue(value) {
  return JSON.stringify(value).replaceAll(
    /[<>&\u2028\u2029]/g,
    character => INLINE_SCRIPT_ESCAPE_CHARACTERS[character]
  )
}

export function resolveMatomoConfigFromEnvironment(environment = {}) {
  return resolveMatomoConfig({
    disabled: environment.MATOMO_DISABLED
      ?? environment.NEXT_PUBLIC_MATOMO_DISABLED,
    siteId: environment.MATOMO_SITE_ID
      ?? environment.NEXT_PUBLIC_MATOMO_SITE_ID,
    url: environment.MATOMO_URL
      ?? environment.NEXT_PUBLIC_MATOMO_URL
  })
}
