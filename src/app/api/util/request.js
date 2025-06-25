import {redirect} from 'next/navigation'
import {getServerSession} from 'next-auth'
import {getSession, signOut} from 'next-auth/react'

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
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined') {
        await signOut({callbackUrl: '/login'})
      }

      redirect('/login')
    }

    if (response.headers.get('Content-Type')?.startsWith('application/json')) {
      const errorBody = await response.json()
      const error = new Error(errorBody.message)
      error.code = errorBody.code
      error.details = errorBody.details
      throw error
    }

    const error = new Error(response.statusText)
    error.code = response.status
    throw error
  }

  // TODO : Les fonctions qui appellent executeRequest consomment encore directement
  //        response.json(), ce qui limite la gestion fine des erreurs renvoyées par
  //        l'API et empêche de profiter des fallbacks d'erreur de Next.js. Quand ces
  //        fonctions auront été refactorisées pour manipuler la Response (status,
  //        headers, etc.) avant de parser le JSON, on pourra décommenter ou adapter
  //        le bloc ci‑dessous.
  // if (response.headers.get('Content-Type')?.startsWith('application/json')) {
  //   return response.json()
  // }

  return response
}
