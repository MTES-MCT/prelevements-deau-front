const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function getPointsPrelevement() {
  const response = await fetch(`${API_URL}/api/points-prelevement`)
  const dossiers = await response.json()
  return dossiers
}

export async function getExploitationsByPointId(pointId) {
  const response = await fetch(`${API_URL}/api/points-prelevement/${pointId}/exploitations`)
  const exploitations = await response.json()
  return exploitations
}
