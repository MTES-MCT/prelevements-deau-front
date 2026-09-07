import {
  pointOriginLabels,
  pointWithdrawalTypeLabels
} from '@/lib/point-characteristics.js'
import {getPointFlowType, getPointFlowTypeLabel} from '@/lib/point-flow-types.js'
import {
  MISSING_USAGE_KEY,
  WATER_BODY_TYPE_LABELS,
  getPointUsageRootKeys
} from '@/lib/points-prelevement-filters.js'
import {getUsageColor, getUsageLabel} from '@/lib/water-uses.js'

const collator = new Intl.Collator('fr-FR', {numeric: true, sensitivity: 'base'})
const MISSING_USAGE_COLOR = '#929292'

const getUsageColorFromKey = usageKey => usageKey === MISSING_USAGE_KEY
  ? MISSING_USAGE_COLOR
  : getUsageColor(usageKey)

export const getUsageMarkerBackground = usageKeys => {
  const colors = usageKeys.map(usageKey => getUsageColorFromKey(usageKey))
  if (colors.length <= 1) {
    return colors[0] ?? MISSING_USAGE_COLOR
  }

  const segmentSize = 100 / colors.length
  const segments = colors.map((color, index) =>
    `${color} ${index * segmentSize}% ${(index + 1) * segmentSize}%`)

  return `conic-gradient(${segments.join(', ')})`
}

const getUsageLabels = usageKeys => usageKeys.map(usageKey => usageKey === MISSING_USAGE_KEY
  ? 'Usage non renseigné'
  : getUsageLabel(usageKey))

const getUsageSummary = labels => labels.length <= 2
  ? labels.join(' · ')
  : `${labels.slice(0, 2).join(' · ')} + ${labels.length - 2}`

const getOptionalTile = (labels, value, accessibleLabel) => value
  ? {
    accessibleLabel: `${accessibleLabel} : ${labels[value] ?? value}`,
    label: labels[value] ?? value
  }
  : null

const getWaterBodyTypeTile = value => {
  if (!value) {
    return null
  }

  const label = WATER_BODY_TYPE_LABELS[value] ?? value

  return {
    accessibleLabel: `Type de milieu : ${label}`,
    label
  }
}

export function createPointListPresentation(point) {
  const flowType = getPointFlowType(point)
  const flowTypeLabel = getPointFlowTypeLabel(flowType)
  const usageKeys = getPointUsageRootKeys(point)
  const usageLabels = getUsageLabels(usageKeys)
  const usageAccessibleLabel = `Usage : ${usageLabels.join(', ')}`
  const preleveurLabels = [...new Set(
    (Array.isArray(point?.preleveurLabels) ? point.preleveurLabels : [])
      .filter(label => typeof label === 'string')
      .map(label => label.trim())
      .filter(Boolean)
  )].sort((left, right) => collator.compare(left, right) || left.localeCompare(right, 'fr-FR'))

  return {
    flowType: {
      accessibleLabel: `Type de point : ${flowTypeLabel}`,
      label: flowTypeLabel,
      value: flowType
    },
    nature: getOptionalTile(
      pointOriginLabels,
      point?.nature,
      'Origine prélèvement / rejet'
    ),
    preleveurLabels,
    usage: {
      accessibleLabel: usageAccessibleLabel,
      label: getUsageSummary(usageLabels),
      markerBackground: getUsageMarkerBackground(usageKeys)
    },
    waterBodyType: getWaterBodyTypeTile(point?.waterBodyType),
    withdrawalType: getOptionalTile(
      pointWithdrawalTypeLabels,
      point?.withdrawalType,
      'Type de prélèvement / rejet'
    )
  }
}
