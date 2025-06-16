'use server'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const {API_TOKEN} = process.env

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Token ${API_TOKEN}`
}

export async function getPointsPrelevement() {
  const response = await fetch(`${API_URL}/api/points-prelevement`, {headers})
  return response.json()
}

export async function getPointPrelevement(id) {
  const response = await fetch(`${API_URL}/api/points-prelevement/${id}`, {headers})
  return response.json()
}

export async function createPointPrelevement(payload) {
  const response = await fetch(`${API_URL}/api/points-prelevement`, {
    headers,
    method: 'POST',
    body: JSON.stringify(payload)
  })

  return response.json()
}

export async function editPointPrelevement(id, payload) {
  const response = await fetch(`${API_URL}/api/points-prelevement/${id}`, {
    headers,
    method: 'PUT',
    body: JSON.stringify(payload)
  })

  return response.json()
}

export async function deletePointPrelevement(id) {
  const response = await fetch(`${API_URL}/api/points-prelevement/${id}`, {
    headers,
    method: 'DELETE'
  })

  return response.json()
}

export async function getPreleveur(id) {
  try {
    const response = await fetch(`${API_URL}/api/preleveurs/${id}`, {headers})
    return response.json()
  } catch {
    return null
  }
}

export async function getPreleveurs() {
  try {
    const response = await fetch(`${API_URL}/api/preleveurs`, {headers})
    return response.json()
  } catch {
    return null
  }
}

export async function getPointsFromPreleveur(idPreleveur) {
  try {
    const response = await fetch(`${API_URL}/api/preleveurs/${idPreleveur}/points-prelevement`, {headers})
    return response.json()
  } catch {
    return null
  }
}

export async function getExploitationsByPointId(pointId) {
  const response = await fetch(`${API_URL}/api/points-prelevement/${pointId}/exploitations`, {headers})
  const exploitations = await response.json()
  return exploitations
}

export async function getStats() {
  const response = await fetch(`${API_URL}/api/stats`)
  const stats = await response.json()

  return stats
}

export async function getVolumesExploitation(exploitationId) {
  const response = await fetch(`${API_URL}/api/exploitations/${exploitationId}/volumes-preleves`, {headers})
  const volumes = await response.json()
  return volumes
}

export async function getBnpe() {
  const response = await fetch(`${API_URL}/api/referentiels/bnpe`, {headers})
  const bnpe = await response.json()

  return bnpe
}

export async function getMeso() {
  const response = await fetch(`${API_URL}/api/referentiels/meso`, {headers})
  const meso = await response.json()

  return meso
}

export async function getMeContinentales() {
  const response = await fetch(`${API_URL}/api/referentiels/me-continentales-bv`, {headers})
  const meContinentales = await response.json()

  return meContinentales
}

export async function getBvBdcarthage() {
  const response = await fetch(`${API_URL}/api/referentiels/bv-bdcarthage`, {headers})
  const bvBdCarthage = await response.json()

  return bvBdCarthage
}
