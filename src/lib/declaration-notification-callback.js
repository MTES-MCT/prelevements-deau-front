export function getDeclarationNotificationCallbackUrl({
  requestUrl,
  headers,
  configuredUrl
}) {
  if (configuredUrl) {
    return new URL('/mes-declarations/new', new URL(configuredUrl).origin)
  }

  const forwardedHost = headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(requestUrl).origin

  return new URL('/mes-declarations/new', origin)
}
