'use client'

import {useEffect} from 'react'

import {useRouter, useSearchParams} from 'next/navigation'

/**
 * Client component to handle token in URL from backend redirect
 * Backend redirects to '/?token=...' so we need to catch it and redirect to callback page
 */
const TokenRedirectHandler = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    // If token or error present, redirect to callback page
    if (token || error) {
      const params = new URLSearchParams()
      if (token) {
        params.set('token', token)
      }

      if (error) {
        params.set('error', error)
      }

      router.replace(`/auth/callback?${params.toString()}`)
    }
  }, [searchParams, router])

  return null
}

export default TokenRedirectHandler
