import {executeRequest} from './util/request.js'

export async function getPointsPrelevement() {
  const response = await executeRequest('api/points-prelevement')
  return response.json()
}

export async function getPointPrelevement(id) {
  const response = await executeRequest(`api/points-prelevement/${id}`)
  if (response.ok === false) {
    return null
  }

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
  const response = await executeRequest(`api/preleveurs/${id}`)
  if (response.ok === false) {
    return null
  }

  return response.json()
}

export async function getPreleveurs() {
  const response = await executeRequest('api/preleveurs')
  return response.json()
}

export async function getPointsFromPreleveur(idPreleveur) {
  const response = await executeRequest(`api/preleveurs/${idPreleveur}/points-prelevement`)
  if (response.ok === false) {
    return null
  }

  return response.json()
}

export async function createPreleveur(payload) {
  const response = await executeRequest(
    'api/preleveurs',
    {method: 'POST', body: payload}
  )

  return response.json()
}

export async function updatePreleveur(idPreleveur, payload) {
  const response = await executeRequest(
    `api/preleveurs/${idPreleveur}`,
    {method: 'PUT', body: payload}
  )

  return response.json()
}

export async function deletePreleveur(idPreleveur) {
  const response = await executeRequest(
    `api/preleveurs/${idPreleveur}`,
    {method: 'DELETE'}
  )

  return response.json()
}

export async function createExploitation(payload) {
  const response = await executeRequest(
    'api/exploitations',
    {method: 'POST', body: payload}
  )
  return response.json()
}

export async function updateExploitation(idExploitation, payload) {
  const response = await executeRequest(
    `api/exploitations/${idExploitation}`,
    {method: 'PUT', body: payload}
  )
  return response.json()
}

export async function getExploitation(exploitationId) {
  const response = await executeRequest(`api/exploitations/${exploitationId}`)
  if (response.ok === false) {
    return null
  }

  return response.json()
}

export async function getExploitationsByPointId(pointId) {
  const response = await executeRequest(`api/points-prelevement/${pointId}/exploitations`)
  return response.json()
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
  return response.json()
}

export async function getVolumesExploitation(exploitationId) {
  const response = await executeRequest(`api/exploitations/${exploitationId}/volumes-preleves`)
  return response.json()
}

export async function getBnpe() {
  const response = await executeRequest('api/referentiels/bnpe')
  return response.json()
}

export async function getMeso() {
  const response = await executeRequest('api/referentiels/meso')
  return response.json()
}

export async function getMeContinentales() {
  const response = await executeRequest('api/referentiels/me-continentales-bv')
  return response.json()
}

export async function getBvBdcarthage() {
  const response = await executeRequest('api/referentiels/bv-bdcarthage')
  return response.json()
}
