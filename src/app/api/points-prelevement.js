const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function getPointsPrelevement() {
  const response = await fetch(`${API_URL}/api/points-prelevement`)
  const dossiers = await response.json()
  return dossiers
}

export async function getPointPrelevement(id) {
  const response = await fetch(`${API_URL}/api/points-prelevement/${id}`)
  const dossier = await response.json()
  return dossier
}

export async function getBss(id) {
  try {
    const response = await fetch(`${API_URL}/api/bss/${id}`)
    const bss = await response.json()
    return bss
  } catch {
    return null
  }
}

export async function getBnpe(id) {
  try {
    const response = await fetch(`${API_URL}/api/bnpe/${id}`)
    const bnpe = await response.json()
    return bnpe
  } catch {
    return null
  }
}

export async function getLibelleCommune(codeInsee) {
  try {
    const response = await fetch(`${API_URL}/api/commune/${codeInsee}`)
    const commune = await response.json()
    console.log(commune)
    return commune
  } catch {
    return null
  }
}
