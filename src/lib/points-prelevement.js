export function formatAutresNoms(autresNoms) {
  if (!autresNoms) {
    return null
  }

  const cleanedStr = autresNoms.replaceAll(/[{}"]/g, '')
  const result = '(' + [...new Set(cleanedStr.split(','))].join(', ') + ')'

  return result
}

export function extractUsages(points) {
  const usagesSet = new Set()
  for (const point of points) {
    if (point.usages) {
      for (const usage of point.usages) {
        if (usage) {
          usagesSet.add(usage)
        }
      }
    }
  }

  return [...usagesSet]
}

export function extractTypeMilieu(points) {
  const typeMilieuSet = new Set()
  for (const point of points) {
    if (point.type_milieu) { // Filter undefined values
      typeMilieuSet.add(point.type_milieu)
    }
  }

  return [...typeMilieuSet]
}

export const colors = ['#007cbf', '#00a6a6', '#f0f0f0']

export function createPointPrelevementFeatures(points) {
  return {
    type: 'FeatureCollection',
    features: points.map(point => ({
      type: 'Feature',
      geometry: point.geom,
      id: point.id_point,
      properties: {
        ...point,
        textOffset: [0, 1.5 + (0.07 * Math.min(point.nom?.length || 0, 50))]
      }
    }))
  }
}

export function donutSegment(start, end, r, r0, color) {
  if (end - start === 1) {
    end -= 0.000_01
  }

  const a0 = 2 * Math.PI * (start - 0.25)
  const a1 = 2 * Math.PI * (end - 0.25)
  const x0 = Math.cos(a0)
  const y0 = Math.sin(a0)
  const x1 = Math.cos(a1)
  const y1 = Math.sin(a1)
  const largeArc = end - start > 0.5 ? 1 : 0

  return [
    '<path d="M',
    r + (r0 * x0),
    r + (r0 * y0),
    'L',
    r + (r * x0),
    r + (r * y0),
    'A',
    r,
    r,
    0,
    largeArc,
    1,
    r + (r * x1),
    r + (r * y1),
    'L',
    r + (r0 * x1),
    r + (r0 * y1),
    'A',
    r0,
    r0,
    0,
    largeArc,
    0,
    r + (r0 * x0),
    r + (r0 * y0),
    `" fill="${color}" />`
  ].join(' ')
}

export function highlightPoint(map, layerId, pointId) {
  map.setPaintProperty(layerId, 'circle-stroke-color', [
    'case',
    ['==', ['get', 'id_point'], pointId],
    'hotpink',
    'black'
  ])

  map.setPaintProperty(layerId, 'circle-stroke-width', [
    'case',
    ['==', ['get', 'id_point'], pointId],
    3,
    1
  ])
}

export const usageColors = {
  'Camion citerne': '#8a2be2',
  'Eau potable': '#007cbf',
  Agriculture: '#00a6a6',
  Hydroélectricité: '#FFCC00',
  Autre: '#f0f0f0',
  'Eau embouteillée': '#ffa6c9',
  Industrie: '#ff6347',
  'Non renseigné': '#ccc'
}

/**
 * Crée un "pie chart" (camembert) <svg> à partir d'un tableau d'usages (ex: ['Agriculture','Eau potable']).
 */
export function createUsagePieChart(props) {
  // On récupère le tableau des usages
  const usages = props.usages ? JSON.parse(props.usages) : []
  const count = usages.length

  // Conteneur principal
  const container = document.createElement('div')
  container.style.display = 'block'

  // Prépare un <svg> centré sur (r, r)
  const svgSize = 24
  const radius = 10
  const cx = radius
  const cy = radius
  container.style.width = svgSize + 4
  container.style.height = svgSize + 4

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const borderCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  borderCircle.setAttribute('cx', cx)
  borderCircle.setAttribute('cy', cy)
  borderCircle.setAttribute('r', radius + 2)
  borderCircle.setAttribute('fill', 'white')

  svg.append(borderCircle)
  svg.setAttribute('width', String(svgSize))
  svg.setAttribute('height', String(svgSize))
  svg.setAttribute('viewBox', `-2 -2 ${svgSize} ${svgSize}`)
  svg.style.display = 'block'

  // Ajoute le <svg> au conteneur
  container.append(svg)

  // Si aucun usage -> affiche un simple cercle gris
  if (count === 0) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', cx)
    circle.setAttribute('cy', cy)
    circle.setAttribute('r', radius)
    circle.setAttribute('fill', '#ccc')
    svg.append(circle)
    return container
  }

  // Chaque usage aura un segment (start->end)
  for (let i = 0; i < count; i++) {
    const usageName = usages[i]
    const color = usageColors[usageName] || '#ccc'
    const start = i / count
    const end = (i + 1) / count
    const segmentPath = createPieSegment(cx, cy, radius, start, end, color)
    svg.append(segmentPath)
  }

  return container
}

/**
 * Construit un segment de "pie chart" (camembert).
 * - (start, end) sont des fractions entre 0 et 1 (ex: 0 => 12h, 0.25 => 9h, etc.)
 * - Décalage de 0.25 pour avoir l'origine à 12h
 */
function createPieSegment(cx, cy, r, start, end, color) {
  // Évite un arc à 360° complet
  if (end - start === 1) {
    end -= 0.000_01
  }

  const a0 = 2 * Math.PI * (start - 0.25)
  const a1 = 2 * Math.PI * (end - 0.25)

  const x0 = Math.cos(a0)
  const y0 = Math.sin(a0)
  const x1 = Math.cos(a1)
  const y1 = Math.sin(a1)

  const largeArc = (end - start) > 0.5 ? 1 : 0

  /**
   * Path "camembert" :
   * - M (centre)
   * - L (point sur le cercle, angle start)
   * - A (arc de cercle jusqu'à angle end)
   * - Z (on referme vers le centre)
   */
  const d = [
    `M ${cx} ${cy}`,
    `L ${cx + (r * x0)} ${cy + (r * y0)}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${cx + (r * x1)} ${cy + (r * y1)}`,
    'Z'
  ].join(' ')

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  path.setAttribute('fill', color)

  return path
}

export function computeBestPopupAnchor(map, coords) {
  // Calcul de la position du point en pixels
  const canvas = map.getCanvas()
  const canvasWidth = canvas.clientWidth
  const canvasHeight = canvas.clientHeight
  const screenPoint = map.project(coords)
  const marginTop = screenPoint.y
  const marginBottom = canvasHeight - screenPoint.y
  const marginLeft = screenPoint.x
  const marginRight = canvasWidth - screenPoint.x

  // Choix dynamique de l'ancre en fonction de la marge minimale
  let anchor = 'bottom' // Valeur par défaut
  if (marginTop < marginBottom && marginTop < marginLeft && marginTop < marginRight) {
    anchor = 'top' // Le point est proche du haut → affiche la popup en dessous (ancre "top")
  } else if (marginBottom < marginTop && marginBottom < marginLeft && marginBottom < marginRight) {
    anchor = 'bottom' // Le point est proche du bas → affiche la popup au-dessus (ancre "bottom")
  } else if (marginLeft < marginTop && marginLeft < marginBottom && marginLeft < marginRight) {
    anchor = 'left' // Le point est proche de la gauche → affiche la popup à droite (ancre "left")
  } else if (marginRight < marginTop && marginRight < marginBottom && marginRight < marginLeft) {
    anchor = 'right' // Le point est proche de la droite → affiche la popup à gauche (ancre "right")
  }

  return anchor
}
