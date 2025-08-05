export async function getCommuneFromCoords({lat, lon}) {
  const response = await fetch(`https://data.geopf.fr/geocodage/reverse?index=poi&category=commune&lon=${lon}&lat=${lat}`)
  const communes = await response.json()

  return communes?.features[0]?.properties?.name[0]
}
