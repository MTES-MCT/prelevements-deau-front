import {parseAuthConfig} from '@/lib/auth-methods.js'
import {cachePerRequest} from '@/server/request-cache.js'

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL

const getCachedAuthConfig = cachePerRequest(async () => {
  if (!API_URL) {
    throw new Error('API_URL est requis pour charger les méthodes d’authentification.')
  }

  const response = await fetch(`${API_URL}/auth/config`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Impossible de charger les méthodes d’authentification (${response.status}).`)
  }

  return parseAuthConfig(await response.json())
})

export function getAuthConfig() {
  return getCachedAuthConfig()
}

export async function getAuthConfigState() {
  try {
    return {
      available: true,
      config: await getAuthConfig()
    }
  } catch {
    return {
      available: false,
      config: {methods: []}
    }
  }
}
