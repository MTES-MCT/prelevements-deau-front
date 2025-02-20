const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function getPointsPrelevement() {
  const response = await fetch(`${API_URL}/api/points-prelevement`)
  return response.json()
}

export async function getPointPrelevement(id) {
  const response = await fetch(`${API_URL}/api/points-prelevement/${id}`)
  return response.json()
}

export async function getExploitationsFromPointId(id) {
  try {
    const response = await fetch(`${API_URL}/api/points-prelevement/${id}/exploitations`)
    return response.json()
  } catch {
    return null
  }
}

export async function getDocumentsFromExploitationId(id) {
  try {
    const response = await fetch(`${API_URL}/api/exploitations/${id}/documents`)
    return response.json()
  } catch {
    return null
  }
}

export async function getBeneficiaire(id) {
  try {
    const response = await fetch(`${API_URL}/api/beneficiaires/${id}`)
    return response.json()
  } catch {
    return null
  }
}

export async function getBss(id) {
  if (!id) {
    return null
  }

  try {
    const response = await fetch(`${API_URL}/api/bss/${id}`)
    return response.json()
  } catch {
    return null
  }
}

export async function getBnpe(id) {
  if (!id) {
    return null
  }

  try {
    const response = await fetch(`${API_URL}/api/bnpe/${id}`)
    return response.json()
  } catch {
    return null
  }
}

export async function getLibelleCommune(codeInsee) {
  try {
    const response = await fetch(`${API_URL}/api/commune/${codeInsee}`)
    return response.json()
  } catch {
    return null
  }
}
