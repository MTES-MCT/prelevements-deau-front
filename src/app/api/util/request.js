import {redirect} from 'next/navigation'
import {getServerSession} from 'next-auth'
import {getSession, signOut} from 'next-auth/react'

import {authOptions} from '@/server/auth.js'

export const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function getAuthorization() {
  try {
    let authToken
    if (typeof window === 'undefined') {
      const session = await getServerSession(authOptions)
      authToken = session?.user?.token
    } else {
      const session = await getSession()
      authToken = session?.user?.token
    }

    if (authToken) {
      return `Token ${authToken}`
    }
  } catch (error) {
    console.error('Unable to retrieve auth token', error)
  }
}

export async function executeRequest(url, options = {}) {
  const {method, body, headers} = options

  const fetchOptions = {
    method: method || 'GET',
    headers
  }

  if (body && body instanceof Blob) {
    fetchOptions.headers['Content-Type'] = body.type || 'application/octet-stream'
    fetchOptions.body = body
  } else if (body) {
    fetchOptions.headers['Content-Type'] = 'application/json'
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_URL}/${url}`, fetchOptions)

  if (!response.ok // Handle authentication errors by forcing a sign‑out then redirecting.
    && (response.status === 401 || response.status === 403)) {
    if (typeof window !== 'undefined') {
      await signOut({callbackUrl: '/login'})
    }

    redirect('/login')
  }

  return response
}
