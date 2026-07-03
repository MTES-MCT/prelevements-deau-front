import proj4 from 'proj4'

const wgs84Projection = 'EPSG:4326'
const lambert93Projection = 'EPSG:2154'

proj4.defs(
  wgs84Projection,
  '+proj=longlat +datum=WGS84 +no_defs +type=crs'
)

proj4.defs(
  lambert93Projection,
  '+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
)

function isCoordinatePair(coordinates) {
  return Array.isArray(coordinates)
    && coordinates.length === 2
    && coordinates.every(value => Number.isFinite(value))
}

export function wgs84ToLambert93(coordinates) {
  if (!isCoordinatePair(coordinates)) {
    return null
  }

  return proj4(wgs84Projection, lambert93Projection, coordinates)
}

export function lambert93ToWgs84(coordinates) {
  if (!isCoordinatePair(coordinates)) {
    return null
  }

  return proj4(lambert93Projection, wgs84Projection, coordinates)
}

export function parseCoordinateInput(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value
    .trim()
    .replaceAll(/\s/g, '')
    .replace(',', '.')

  if (!normalized) {
    return null
  }

  const number = Number(normalized)

  return Number.isFinite(number) ? number : null
}

export function formatCoordinateInput(value, maximumFractionDigits = 6) {
  if (!Number.isFinite(value)) {
    return ''
  }

  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits,
    useGrouping: false
  }).format(value)
}

export function formatCoordinateLabel(value, maximumFractionDigits = 3) {
  if (!Number.isFinite(value)) {
    return ''
  }

  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits
  }).format(value)
}
