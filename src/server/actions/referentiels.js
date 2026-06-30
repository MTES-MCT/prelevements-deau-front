'use server'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

export async function getWaterUsesAction() {
  return withErrorHandling(async () => fetchJSON('api/referentiels/usages-eau'))
}
