'use client'

import {useEffect} from 'react'

import {usePathname} from 'next/navigation'
import {useSession} from 'next-auth/react'

import {isAuthGuardPublicPath} from '@/lib/public-paths.js'
import {getPreleveurSelectionRedirect} from '@/lib/preleveur-profiles.js'

const AuthSessionGuard = ({children}) => {
  const {data: session, status} = useSession()
  const pathname = usePathname()
  const selectionRedirect = status === 'authenticated'
    ? getPreleveurSelectionRedirect(pathname, session?.user?.preleveurProfiles)
    : null

  useEffect(() => {
    if (selectionRedirect) {
      window.location.replace(selectionRedirect)
      return
    }

    if (status !== 'unauthenticated' || isAuthGuardPublicPath(pathname)) {
      return
    }

    const callbackUrl = `${pathname}${window.location.search}`
    const searchParams = new URLSearchParams({
      error: 'session_expired',
      callbackUrl
    })

    window.location.replace(`/login?${searchParams.toString()}`)
  }, [pathname, status, selectionRedirect])

  return selectionRedirect ? null : children
}

export default AuthSessionGuard
