import {STATS_PATH} from './public-routes.js'

const MIDDLEWARE_EXACT_PUBLIC_PATHS = new Set([
  '/',
  '/activation-mot-de-passe',
  '/login',
  STATS_PATH,
  '/validation-email'
])

const MIDDLEWARE_PUBLIC_PATH_PREFIXES = [
  '/auth/',
  '/validation-email/'
]

const AUTH_GUARD_PUBLIC_PATH_PREFIXES = [
  '/activation-mot-de-passe',
  '/auth',
  '/login',
  '/validation-email'
]

export function isMiddlewarePublicPath(pathname) {
  return MIDDLEWARE_EXACT_PUBLIC_PATHS.has(pathname)
    || MIDDLEWARE_PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function isAuthGuardPublicPath(pathname) {
  if (pathname === '/' || pathname === STATS_PATH) {
    return true
  }

  return AUTH_GUARD_PUBLIC_PATH_PREFIXES.some(path => (
    pathname === path || pathname.startsWith(`${path}/`)
  ))
}
