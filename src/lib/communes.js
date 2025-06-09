export async function getCommuneFromCoords({lat, lon}) {
  const response = await fetch(`https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&fields=code,nom`)
  const communes = await response.json()

  return communes[0]
}
