import {
  AgricultureOutlined, BoltOutlined, DeviceThermostatOutlined, EditOffOutlined, FactoryOutlined,
  InterestsOutlined,
  LiquorOutlined,
  LocalDrinkOutlined,
  LocalShippingOutlined
} from '@mui/icons-material'
import {some, mapValues} from 'lodash-es'

import {legendColors} from '@/components/map/legend-colors.js'

// Fonction utilitaire pour récupérer la couleur associée à un usage
export const getUsageColor = usage => {
  const {color: background, textColor} = legendColors.usages.find(u => u.text === usage) || {}
  return {background, textColor}
}

// Fonction utilitaire pour récupérer la couleur associée au type de milieu
export const getTypeMilieuColor = typeMilieu => {
  const {color: background, textColor} = legendColors.typesMilieu.find(u => u.text === typeMilieu) || {}
  return {background, textColor}
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

export function extractCommunes(points) {
  const communesSet = new Set()
  for (const point of points) {
    if (point.commune && point.commune.nom && point.commune.code) {
      communesSet.add(`${point.commune.nom} - ${point.commune.code}`)
    }
  }

  return [...communesSet].sort((a, b) => a.localeCompare(b, 'fr', {sensitivity: 'base'}))
}

export function extractStatus(points) {
  const statusSet = new Set()
  for (const point of points) {
    if (point.exploitationsStatus) {
      statusSet.add(point.exploitationsStatus)
    }
  }

  return [...statusSet]
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
      geometry: point.coordinates,
      id: point.id,
      properties: {
        ...point,
        textOffset: [0, 1.5 + (0.07 * Math.min(point.nom?.length || 0, 50))]
      }
    }))
  }
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

export const usageIcons = {
  'Eau potable': LocalDrinkOutlined,
  Agriculture: AgricultureOutlined,
  Autre: InterestsOutlined,
  'Camion citerne': LocalShippingOutlined,
  'Eau embouteillée': LiquorOutlined,
  Hydroélectricité: BoltOutlined,
  Industrie: FactoryOutlined,
  'non-renseignée': EditOffOutlined,
  Thermalisme: DeviceThermostatOutlined
}

/**
 * Crée un "pie chart" (camembert) <svg> à partir d'un tableau d'usages (ex: ['Agriculture','Eau potable']).
 */
export function createUsagePieChart(usages) {
  const count = usages.length
  const container = document.createElement('div')
  container.style.display = 'block'
  const svgSize = 24
  const radius = 10
  const cx = radius
  const cy = radius
  container.style.width = svgSize + 4
  container.style.height = svgSize + 4

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  // Ajout du namespace nécessaire
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

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
  container.append(svg)

  if (count === 0) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', cx)
    circle.setAttribute('cy', cy)
    circle.setAttribute('r', radius)
    circle.setAttribute('fill', '#ccc')
    svg.append(circle)
    return container
  }

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

// Estimated popup dimensions (can be adjusted based on actual popup size)
const ESTIMATED_POPUP_HEIGHT = 310
const ESTIMATED_POPUP_WIDTH = 200

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

  // Prioritize vertical positioning first (top/bottom)
  // Only use left/right if there's not enough vertical space
  let anchor = 'bottom' // Default

  // Check if there's enough space at the bottom
  if (marginBottom >= ESTIMATED_POPUP_HEIGHT) {
    anchor = 'top' // Popup appears below the point
  } else if (marginTop >= ESTIMATED_POPUP_HEIGHT) {
    anchor = 'bottom' // Popup appears above the point
  } else if (marginRight >= ESTIMATED_POPUP_WIDTH) {
    anchor = 'left' // Popup appears to the right of the point
  } else if (marginLeft >= ESTIMATED_POPUP_WIDTH) {
    anchor = 'right' // Popup appears to the left of the point
  } else {
    // If no direction has enough space, choose the one with the most space
    const maxSpace = Math.max(marginTop, marginBottom, marginLeft, marginRight)
    // Tie-breaking order: bottom > top > right > left
    switch (maxSpace) {
      case marginBottom: {
        anchor = 'top'
        break
      }

      case marginTop: {
        anchor = 'bottom'
        break
      }

      case marginRight: {
        anchor = 'left'
        break
      }

      default: {
        anchor = 'right'
      }
    }
  }

  return anchor
}

// Fonction utilitaire pour générer une data URL à partir d'un container contenant un <svg>
export function createSVGDataURL(container) {
  const svgElement = container.querySelector('svg')
  if (!svgElement) {
    throw new Error('Aucun élément SVG trouvé dans le container')
  }

  const svgMarkup = svgElement.outerHTML
  const encoded = encodeURIComponent(svgMarkup)
  return `data:image/svg+xml;charset=utf8,${encoded}`
}

/**
 * Détermine un statut ('success' | 'warning' | 'error' | 'unknown')
 * à partir d'un tableau d'erreurs éventuellement vide.
 */
const statusFromErrors = (errors = []) => {
  if (some(errors, {severity: 'error'})) {
    return 'error'
  }

  if (some(errors, {severity: 'warning'})) {
    return 'warning'
  }

  return 'success'
}

/**
 * Initialise tous les points à 'unknown'.
 */
const buildBaseStatus = pointsPrelevement => {
  const statuses = {}
  for (const pointPrelevement of pointsPrelevement) {
    statuses[pointPrelevement.id_point] = 'unknown'
  }

  return statuses
}

/* ---------- 1. Soumissions avec fichiers ---------- */

/**
 * Cas typePrelevement === 'aep-zre'
 * Un fichier ⇢ un point ⇢ potentiellement plusieurs erreurs.
 */
const statusesFromAepZreFiles = files => {
  const groupedErrors = {}

  for (const file of files.filter(f => !f.processingError && Array.isArray(f.series) && f.series.length > 0)) {
    const points = [...new Set(file.series.map(s => s.pointPrelevement).filter(Boolean))]
    for (const pointId of points) {
      groupedErrors[pointId] ||= []
      if (file.result.errors) {
        groupedErrors[pointId].push(...file.result.errors)
      }
    }
  }

  return mapValues(groupedErrors, statusFromErrors)
}

/**
 * Cas typePrelevement === 'camion-citerne'
 * Un fichier ⇢ plusieurs points.
 */
const statusesFromCamionFiles = files => {
  const statusPerPoint = {}

  for (const file of files
    .filter(f => !f.processingError && Array.isArray(f.series) && f.series.length > 0)) {
    const points = [...new Set(file.series
      .map(s => s.pointPrelevement)
      .filter(Boolean))]
    const fileStatus = statusFromErrors(file.result.errors)
    for (const id of points) {
      statusPerPoint[id] = fileStatus
    }
  }

  return statusPerPoint
}

/* ---------- 2. Soumissions sans fichier ---------- */

const statusesFromManualEntries = (dossier, pointsPrelevement) => {
  const hasData = (dossier.relevesIndex?.length ?? 0) > 0
                  || (dossier.volumesPompes?.length ?? 0) > 0

  if (!hasData || pointsPrelevement.length === 0) {
    return {}
  }

  return Object.fromEntries(
    pointsPrelevement
      .map(pt => [pt.id_point, 'success'])
  )
}

/* ---------- Fonction principale appelée par le composant ---------- */

export const computePointsStatus = ({dossier, files = [], pointsPrelevement}) => {
  if (!pointsPrelevement) {
    return {}
  }

  const statuses = buildBaseStatus(pointsPrelevement)

  if (files.length > 0) {
    Object.assign(statuses,
      dossier.typePrelevement === 'aep-zre'
        ? statusesFromAepZreFiles(files)
        : (dossier.typePrelevement === 'camion-citerne'
          ? statusesFromCamionFiles(files)
          : {})
    )
  } else {
    Object.assign(statuses, statusesFromManualEntries(dossier, pointsPrelevement))
  }

  return statuses
}
