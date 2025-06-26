import {executeRequest} from './util/request.js'

export async function getPointsPrelevement() {
  return executeRequest('api/points-prelevement')
}

export async function getPointPrelevement(id) {
  return executeRequest(`api/points-prelevement/${id}`)
}

export async function createPointPrelevement(payload) {
  return executeRequest('api/points-prelevement', {method: 'POST', body: payload})
}

export async function editPointPrelevement(id, payload) {
  return executeRequest(`api/points-prelevement/${id}`, {method: 'PUT', body: payload})
}

export async function deletePointPrelevement(id) {
  return executeRequest(`api/points-prelevement/${id}`, {method: 'DELETE'})
}

export async function getPreleveur(id) {
  return executeRequest(`api/preleveurs/${id}`)
}

export async function getPreleveurs() {
  return executeRequest('api/preleveurs')
}

export async function getPointsFromPreleveur(idPreleveur) {
  return executeRequest(`api/preleveurs/${idPreleveur}/points-prelevement`)
}

export async function createExploitation(payload) {
  return executeRequest(
    'api/exploitations',
    {method: 'POST', body: JSON.stringify(payload)}
  )
}

export async function updateExploitation(idExploitation, payload) {
  return executeRequest(
    `api/exploitations/${idExploitation}`,
    {method: 'PUT', body: JSON.stringify(payload)}
  )
}

export async function getExploitation(exploitationId) {
  return executeRequest(`api/exploitations/${exploitationId}`)
}

export async function getExploitationsByPointId(pointId) {
  return executeRequest(`api/points-prelevement/${pointId}/exploitations`)
}

export async function deleteExploitation(exploitationId) {
  return executeRequest(
    `api/exploitations/${exploitationId}`,
    {method: 'DELETE'}
  )
}

export async function getStats() {
  return executeRequest('api/stats')
}

export async function getVolumesExploitation(exploitationId) {
  return executeRequest(`api/exploitations/${exploitationId}/volumes-preleves`)
}

export async function getBnpe() {
  return executeRequest('api/referentiels/bnpe')
}

export async function getMeso() {
  return executeRequest('api/referentiels/meso')
}

export async function getMeContinentales() {
  return executeRequest('api/referentiels/me-continentales-bv')
}

export async function getBvBdcarthage() {
  return executeRequest('api/referentiels/bv-bdcarthage')
}
