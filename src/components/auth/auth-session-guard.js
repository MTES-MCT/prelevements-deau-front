'use client'

import {useEffect} from 'react'

import {usePathname} from 'next/navigation'
import {useSession} from 'next-auth/react'

const PUBLIC_PATH_PREFIXES = [
  '/activation-mot-de-passe',
  '/auth',
  '/login'
]

function isPublicPath(pathname) {
  return pathname === '/' || PUBLIC_PATH_PREFIXES.some(path => pathname === path || pathname.startsWith(`${path}/`))
}

const AuthSessionGuard = () => {
  const {status} = useSession()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== 'unauthenticated' || isPublicPath(pathname)) {
      return
    }

    const callbackUrl = `${pathname}${window.location.search}`
    const searchParams = new URLSearchParams({
      error: 'session_expired',
      callbackUrl
    })

    window.location.replace(`/login?${searchParams.toString()}`)
  }, [pathname, status])

  return null
}

export default AuthSessionGuard
