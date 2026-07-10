import {NextResponse} from 'next/server'

import {getDeclarationNotificationCallbackUrl} from '@/lib/declaration-notification-callback.js'

export function GET(request) {
  const url = getDeclarationNotificationCallbackUrl({
    requestUrl: request.url,
    headers: request.headers,
    configuredUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONT_URL
  })

  return NextResponse.redirect(url, 307)
}
