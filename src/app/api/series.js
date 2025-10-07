import {executeRequest, getAuthorization} from './util/request.js'

export async function getSeriesMetadata(seriesId, {withPoint = false} = {}) {
  const search = withPoint ? '?withPoint=1' : ''
  const response = await executeRequest(
    `api/series/${seriesId}${search}`,
    {headers: {Authorization: await getAuthorization()}}
  )

  if (!response.ok) {
    return null
  }

  return response.json()
}

export async function getSeriesValues(seriesId, {start, end, withPoint = false} = {}) {
  const params = new URLSearchParams()
  if (start) {
    params.set('start', start)
  }

  if (end) {
    params.set('end', end)
  }

  if (withPoint) {
    params.set('withPoint', '1')
  }

  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await executeRequest(
    `api/series/${seriesId}/values${query}`,
    {headers: {Authorization: await getAuthorization()}}
  )

  if (!response.ok) {
    return null
  }

  return response.json()
}

export async function searchSeries({preleveurId, pointId, from, to, onlyIntegratedDays} = {}) {
  const params = new URLSearchParams()

  if (preleveurId) {
    params.set('preleveurId', preleveurId)
  }

  if (pointId) {
    params.set('pointId', pointId)
  }

  if (from) {
    params.set('from', from)
  }

  if (to) {
    params.set('to', to)
  }

  if (onlyIntegratedDays) {
    params.set('onlyIntegratedDays', onlyIntegratedDays ? '1' : '0')
  }

  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await executeRequest(
    `api/series${query}`,
    {headers: {Authorization: await getAuthorization()}}
  )

  if (!response.ok) {
    return null
  }

  return response.json()
}
