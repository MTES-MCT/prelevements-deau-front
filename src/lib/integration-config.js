const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export function isEnvironmentFlagEnabled(value) {
  return TRUE_VALUES.has(value?.trim().toLowerCase())
}

export function resolveMatomoConfig({
  disabled,
  siteId,
  url
} = {}) {
  const normalizedUrl = url?.trim() || ''
  const normalizedSiteId = siteId?.trim() || ''

  return {
    enabled: !isEnvironmentFlagEnabled(disabled)
      && Boolean(normalizedUrl && normalizedSiteId),
    siteId: normalizedSiteId,
    url: normalizedUrl
  }
}
