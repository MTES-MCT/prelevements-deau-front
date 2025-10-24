export async function getCommuneFromCoords({lat, lon}) {
  const response = await fetch(`https://data.geopf.fr/geocodage/reverse?index=poi&category=commune&lon=${lon}&lat=${lat}`)
  const communes = await response.json()

  return {
    nom: communes?.features[0]?.properties?.name[0],
    code: communes?.features[0]?.properties?.citycode[0]
  }
}
