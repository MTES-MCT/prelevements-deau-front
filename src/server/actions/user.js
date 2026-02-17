'use server'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'

export async function getCurrentUser() {
  return withErrorHandling(async () => fetchJSON('api/info'))
}
