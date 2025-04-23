const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function getPointsPrelevement() {
  const response = await fetch(`${API_URL}/api/points-prelevement`)
  return response.json()
}

export async function getPointPrelevement(id) {
  const response = await fetch(`${API_URL}/api/points-prelevement/${id}`)
  return response.json()
}

export async function getBeneficiaire(id) {
  try {
    const response = await fetch(`${API_URL}/api/beneficiaires/${id}`)
    return response.json()
  } catch {
    return null
  }
}

export async function getBeneficiaires() {
  try {
    const response = await fetch(`${API_URL}/api/beneficiaires`)
    return response.json()
  } catch {
    return null
  }
}

export async function getPointsFromBeneficiaire(idBeneficiaire) {
  try {
    const response = await fetch(`${API_URL}/api/beneficiaires/${idBeneficiaire}/points-prelevement`)
    return response.json()
  } catch {
    return null
  }
}

export async function getExploitationsByPointId(pointId) {
  const response = await fetch(`${API_URL}/api/points-prelevement/${pointId}/exploitations`)
  const exploitations = await response.json()
  return exploitations
}

export async function getStats() {
  const response = await fetch(`${API_URL}/api/stats`)
  const stats = await response.json()

  return stats
}

export async function getVolumesExploitation(exploitationId) {
  const response = await fetch(`${API_URL}/api/exploitations/${exploitationId}/volumes-preleves`)
  const volumes = await response.json()
  return volumes
}
