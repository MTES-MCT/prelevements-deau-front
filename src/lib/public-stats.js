export const PUBLIC_STATS_UNAVAILABLE = 'Indisponible'

const numberFormatter = new Intl.NumberFormat('fr-FR')
const percentageFormatter = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 1})

export function isStatsCount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isStatsMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function formatStatsCount(value) {
  return isStatsCount(value) ? numberFormatter.format(value) : PUBLIC_STATS_UNAVAILABLE
}

export function formatStatsPercentage(value) {
  return isStatsCount(value) && value <= 100
    ? `${percentageFormatter.format(value)} %`
    : PUBLIC_STATS_UNAVAILABLE
}

export function formatStatsMonth(value, {short = false} = {}) {
  if (!isStatsMonth(value)) {
    return PUBLIC_STATS_UNAVAILABLE
  }

  return new Intl.DateTimeFormat('fr-FR', {
    month: short ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}-01T12:00:00Z`))
}

export function formatStatsDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    return PUBLIC_STATS_UNAVAILABLE
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris'
  }).format(new Date(value))
}

export function getSelectableStatsMonths(months, now = new Date()) {
  const currentMonth = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Europe/Paris'
  }).format(now)

  return [...new Set((months ?? []).filter(month => isStatsMonth(month) && month < currentMonth))]
    .sort((left, right) => right.localeCompare(left))
}

export function getStatsProfiles(profiles) {
  if (!Array.isArray(profiles) || profiles.some(profile => !isStatsCount(profile.count))) {
    return {available: false, total: null, profiles: []}
  }

  const total = profiles.reduce((sum, profile) => sum + profile.count, 0)
  return {
    available: true,
    total,
    profiles: profiles.filter(profile => profile.count > 0).map(profile => ({
      ...profile,
      percentage: total > 0 ? profile.count / total * 100 : null
    }))
  }
}

export function getStatsConnections(months) {
  return (months ?? []).filter(item => isStatsMonth(item.month))
    .sort((left, right) => left.month.localeCompare(right.month))
    .slice(-6)
    .map(item => {
      const available = item.status !== 'unavailable'
        && isStatsCount(item.administration)
        && isStatsCount(item.declarants)
        && isStatsCount(item.total)

      return {
        ...item,
        available,
        administration: available ? item.administration : null,
        declarants: available ? item.declarants : null,
        total: available ? item.total : null
      }
    })
}

export function getPublicStatsUrl(apiUrl, month) {
  if (!apiUrl) {
    throw new Error('PUBLIC_STATS_API_NOT_CONFIGURED')
  }

  let end = apiUrl.length
  while (end > 0 && apiUrl[end - 1] === '/') {
    end -= 1
  }

  const url = new URL(`${apiUrl.slice(0, end)}/api/stats/public`)
  if (month !== undefined && month !== null && month !== '') {
    if (!isStatsMonth(month)) {
      throw new Error('INVALID_STATS_MONTH')
    }

    url.searchParams.set('month', month)
  }

  return url.toString()
}
