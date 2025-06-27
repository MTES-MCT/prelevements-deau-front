import {redirect} from 'next/navigation'
import {getServerSession} from 'next-auth'
import {getSession, signOut} from 'next-auth/react'

import {createHttpError} from '@/lib/http-error.js'
import {authOptions} from '@/server/auth.js'

export const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function executeRequest(urlOrOptions, moreOptions) {
  let url
  let options

  if (typeof urlOrOptions === 'string') {
    url = urlOrOptions
    options = moreOptions
  } else {
    url = urlOrOptions.url
    options = urlOrOptions
  }

  const {method, body} = options || {}

  const fetchOptions = {
    method: method || 'GET',
    headers: {}
  }

  if (body && body instanceof Blob) {
    fetchOptions.headers['Content-Type'] = body.type || 'application/octet-stream'
    fetchOptions.body = body
  } else if (body) {
    fetchOptions.headers['Content-Type'] = 'application/json'
    fetchOptions.body = JSON.stringify(body)
  }

  // Inject Authorization header with the user's token
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
      fetchOptions.headers.Authorization = `Token ${authToken}`
    }
  } catch (error) {
    console.error('Unable to retrieve auth token', error)
  }

  const response = await fetch(`${API_URL}/${url}`, fetchOptions)

  if (!response.ok) {
    // Handle authentication errors by forcing a sign‑out then redirecting.
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined') {
        await signOut({callbackUrl: '/login'})
      }

      redirect('/login')
    }

    // Build a rich error payload so that the client error boundary can
    // understand what happened.  We serialise the payload into the Error
    // message because Next.js only forwards `message` and `digest`.
    let json
    if (response.headers.get('Content-Type')?.startsWith('application/json')) {
      try {
        json = await response.json()
      } catch {} // ignore JSON parse errors
    }

    throw createHttpError({
      status: response.status,
      code: json?.code ?? response.status,
      message: json?.message ?? response.statusText,
      details: json?.details
    })
  }

  if (response.headers.get('Content-Type')?.startsWith('application/json')) {
    return response.json()
  }

  return response
}
