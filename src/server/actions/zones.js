'use server'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'

export async function getZonesActions() {
  return withErrorHandling(async () => fetchJSON('api/zones'))
}
