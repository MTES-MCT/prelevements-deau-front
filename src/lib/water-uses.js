import {usageColors, usageIcons, usageLabels} from '@/components/map/legend-colors.js'

const LEGACY_USAGE_TO_CODE = {
  INCONNU: '0',
  PAS_D_USAGE: '1',
  IRRIGATION: '2',
  AGRICULTURE_ELEVAGE: '3',
  AQUACULTURE: '3B',
  INDUSTRIE: '4',
  AEP: '5',
  ENERGIE: '6',
  LOISIRS: '7',
  EMBOUTEILLAGE: '8',
  THERMALISME_THALASSO: '9',
  DEFENSE_INCENDIE: '10',
  REALIMENTATION_EAU: '12',
  CANAUX: '13',
  ETIAGE: '14',
  ENTRETIEN_VOIRIES: '15',
  ALIMENTATION_SOUTIEN_CANAL: '16',
  DOMESTIQUE: '17'
}
const HIDDEN_DASHBOARD_USAGE_ROOT_CODES = new Set(['17'])

export function getUsageCode(usage) {
  if (!usage) {
    return null
  }

  if (typeof usage === 'object') {
    return usage.code ? String(usage.code).toLocaleUpperCase('fr-FR') : null
  }

  const value = String(usage).trim().toLocaleUpperCase('fr-FR')
  return LEGACY_USAGE_TO_CODE[value] ?? value
}

export function getUsageRootCode(usage) {
  const code = getUsageCode(usage)
  const match = /^(\d+)/.exec(code ?? '')

  return match?.[1] ?? code
}

export function getUsageId(usage) {
  return usage && typeof usage === 'object' ? usage.id ?? null : null
}

export function getUsageLabel(usage) {
  if (!usage) {
    return ''
  }

  if (typeof usage === 'object') {
    return usage.label || usage.mnemonic || usage.code || ''
  }

  const code = getUsageCode(usage)
  return usageLabels[code] ?? String(usage).replaceAll('_', ' ')
}

export function isSubUsage(usage) {
  if (!usage) {
    return false
  }

  if (typeof usage === 'object' && usage.kind) {
    return ['SUB_USAGE', 'SUBUSAGE'].includes(String(usage.kind).toLocaleUpperCase('fr-FR'))
  }

  const code = getUsageCode(usage)
  return /[A-Z]/.test(code ?? '')
}

export function getUsageReferenceLabel(usage) {
  if (!usage) {
    return ''
  }

  return isSubUsage(usage) ? 'Sous-usage' : 'Usage'
}

export function formatUsageReference(usage) {
  return getUsageLabel(usage)
}

export function getUsageColor(usage) {
  const code = getUsageCode(usage)
  const rootCode = getUsageRootCode(usage)

  return (usage && typeof usage === 'object' ? usage.color : null)
    ?? usageColors[code]?.color
    ?? usageColors[rootCode]?.color
    ?? '#cccccc'
}

export function getUsageTextColor(usage) {
  const code = getUsageCode(usage)
  const rootCode = getUsageRootCode(usage)

  return usageColors[code]?.textColor
    ?? usageColors[rootCode]?.textColor
    ?? 'var(--text-default-grey)'
}

export function getUsageIcon(usage) {
  const code = getUsageCode(usage)
  const rootCode = getUsageRootCode(usage)

  return usageIcons[code] ?? usageIcons[rootCode]
}

export function getUsageKey(usage) {
  return getUsageId(usage) ?? getUsageCode(usage) ?? getUsageLabel(usage)
}

export function isDashboardVisibleUsage(usage) {
  return !HIDDEN_DASHBOARD_USAGE_ROOT_CODES.has(getUsageRootCode(usage))
    && usage?.dashboardVisible !== false
}

export function normalizeUsageOption(usage) {
  const id = getUsageId(usage)
  const code = getUsageCode(usage)

  return {
    id,
    value: id ?? code,
    code,
    label: getUsageLabel(usage),
    color: getUsageColor(usage),
    textColor: getUsageTextColor(usage),
    raw: usage
  }
}

export function usageMatchesFilter(usage, filter) {
  if (!filter) {
    return false
  }

  const value = String(filter)
  return [getUsageId(usage), getUsageCode(usage), getUsageRootCode(usage), getUsageLabel(usage)]
    .filter(Boolean)
    .some(item => String(item) === value)
}

export function formatUsages(usages = []) {
  return usages.map(usage => getUsageLabel(usage)).filter(Boolean).join(', ')
}
