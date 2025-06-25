import {executeRequest} from './util/request.js'

export async function getPointsPrelevement() {
  const response = await executeRequest('api/points-prelevement')
  return response.json()
}

export async function getPointPrelevement(id) {
  const response = await executeRequest(`api/points-prelevement/${id}`)
  return response.json()
}

export async function createPointPrelevement(payload) {
  const response = await executeRequest('api/points-prelevement', {method: 'POST', body: payload})
  return response.json()
}

export async function editPointPrelevement(id, payload) {
  const response = await executeRequest(`api/points-prelevement/${id}`, {method: 'PUT', body: payload})
  return response.json()
}

export async function deletePointPrelevement(id) {
  const response = await executeRequest(`api/points-prelevement/${id}`, {method: 'DELETE'})
  return response.json()
}

export async function getPreleveur(id) {
  try {
    const response = await executeRequest(`api/preleveurs/${id}`)
    return response.json()
  } catch {
    return null
  }
}

export async function getPreleveurs() {
  try {
    const response = await executeRequest('api/preleveurs')
    return response.json()
  } catch {
    return null
  }
}

export async function getPointsFromPreleveur(idPreleveur) {
  try {
    const response = await executeRequest(`api/preleveurs/${idPreleveur}/points-prelevement`)
    return response.json()
  } catch {
    return null
  }
}

export async function createExploitation(payload) {
  const response = await executeRequest(
    'api/exploitations',
    {method: 'POST', body: JSON.stringify(payload)}
  )

  return response.json()
}

export async function updateExploitation(idExploitation, payload) {
  const response = await executeRequest(
    `api/exploitations/${idExploitation}`,
    {method: 'PUT', body: JSON.stringify(payload)}
  )

  return response.json()
}

export async function getExploitation(exploitationId) {
  const response = await executeRequest(`api/exploitations/${exploitationId}`)
  const exploitation = await response.json()

  return exploitation
}

export async function getExploitationsByPointId(pointId) {
  const response = await executeRequest(`api/points-prelevement/${pointId}/exploitations`)
  const exploitations = await response.json()
  return exploitations
}

export async function deleteExploitation(exploitationId) {
  const response = await executeRequest(
    `api/exploitations/${exploitationId}`,
    {method: 'DELETE'}
  )

  return response.json()
}

export async function getStats() {
  const response = await executeRequest('api/stats')
  const stats = await response.json()

  return stats
}

export async function getVolumesExploitation(exploitationId) {
  const response = await executeRequest(`api/exploitations/${exploitationId}/volumes-preleves`)
  const volumes = await response.json()
  return volumes
}

export async function getBnpe() {
  const response = await executeRequest('api/referentiels/bnpe')
  const bnpe = await response.json()

  return bnpe
}

export async function getMeso() {
  const response = await executeRequest('api/referentiels/meso')
  const meso = await response.json()

  return meso
}

export async function getMeContinentales() {
  const response = await executeRequest('api/referentiels/me-continentales-bv')
  const meContinentales = await response.json()

  return meContinentales
}

export async function getBvBdcarthage() {
  const response = await executeRequest('api/referentiels/bv-bdcarthage')
  const bvBdCarthage = await response.json()

  return bvBdCarthage
}
