'use server'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

export async function getAdminDashboardAction({startDate, endDate} = {}) {
  const parameters = new URLSearchParams()

  if (startDate) {
    parameters.set('startDate', startDate)
  }

  if (endDate) {
    parameters.set('endDate', endDate)
  }

  const query = parameters.size > 0 ? `?${parameters.toString()}` : ''

  return withErrorHandling(async () =>
    fetchJSON(`api/admin/dashboard${query}`))
}
