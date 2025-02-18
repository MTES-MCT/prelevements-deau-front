const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function getPointsPrelevement() {
  const response = await fetch(`${API_URL}/api/points-prelevement`)
  return response.json()
}

export async function getPointPrelevement(id) {
  const response = await fetch(`${API_URL}/api/points-prelevement/${id}`)
  return response.json()
}
