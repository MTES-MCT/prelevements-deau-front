const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function parseDateInput(value) {
  if (!DATE_INPUT_PATTERN.test(String(value ?? ''))) {
    return null
  }

  const [year, month, day] = String(value).split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null
  }

  return date
}

export function formatDateInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function getInclusiveDayCount(startDate, endDate) {
  const start = parseDateInput(startDate)
  const end = parseDateInput(endDate)

  if (!start || !end || end < start) {
    return 0
  }

  return Math.round((end - start) / 86_400_000) + 1
}

function formatDateLabel(value) {
  const date = parseDateInput(value)
  return date ? new Intl.DateTimeFormat('fr-FR').format(date) : null
}

export function getDateRangeLabel(startDate, endDate) {
  const startLabel = formatDateLabel(startDate)
  const endLabel = formatDateLabel(endDate)

  if (startLabel && endLabel) {
    return `Du ${startLabel} au ${endLabel}`
  }

  if (startLabel) {
    return `Début : ${startLabel}`
  }

  if (endLabel) {
    return `Fin : ${endLabel}`
  }

  return 'Sélectionner une période'
}

export function buildMonthlyDateRangePresets(maxDate) {
  const max = parseDateInput(maxDate)
  const today = max && max < new Date() ? max : new Date()
  const currentMonthStart = startOfMonth(today)
  const previousMonthStart = addMonths(currentMonthStart, -1)

  return [
    {
      label: 'Mois précédent',
      startDate: formatDateInput(previousMonthStart),
      endDate: formatDateInput(endOfMonth(previousMonthStart))
    },
    {
      label: 'Mois en cours',
      startDate: formatDateInput(currentMonthStart),
      endDate: formatDateInput(today)
    }
  ]
}
