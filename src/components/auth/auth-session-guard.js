'use client'

import {useEffect} from 'react'

import {usePathname} from 'next/navigation'
import {useSession} from 'next-auth/react'

import {isAuthGuardPublicPath} from '@/lib/public-paths.js'

const AuthSessionGuard = () => {
  const {status} = useSession()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== 'unauthenticated' || isAuthGuardPublicPath(pathname)) {
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
