import {formatDateInput, parseDateInput} from './date-range.js'

export function switchQuickRowValue(row, from, to) {
  const valueDrafts = {...row.valueDrafts, [from]: row.value}
  return {...row, valueDrafts, value: valueDrafts[to] ?? row.value}
}

export function createQuickEditorRows(declaration) {
  return declaration.entries.map(entry => ({
    ...entry,
    readingDate: entry.readingDate ?? '',
    periodStartDate: entry.periodStartDate ?? '',
    periodEndDate: entry.periodEndDate ?? '',
    value: String(entry.value ?? ''),
    removed: false
  }))
}

export function getQuickMeasurementDates(measurementType, row) {
  return measurementType === 'INDEX'
    ? {readingDate: row.readingDate}
    : {periodStartDate: row.periodStartDate, periodEndDate: row.periodEndDate}
}

export function hasQuickEntryChanged(entry, row, measurementType, originalType) {
  if (measurementType !== originalType || row.removed || row.value === '' || Number(row.value) !== Number(entry.value)) {
    return true
  }

  return Object.entries(getQuickMeasurementDates(measurementType, row)).some(([field, value]) => value !== entry[field])
}

export function getQuickDateErrors(measurementType, row, maxDate) {
  const errors = []
  const fields = measurementType === 'INDEX'
    ? [['readingDate', 'La date du relevé']]
    : [['periodStartDate', 'La date de début'], ['periodEndDate', 'La date de fin']]

  for (const [key, label] of fields) {
    const value = row[key]
    if (!parseDateInput(value)) {
      errors.push(`${label} doit être renseignée et valide.`)
    } else if (value > maxDate) {
      errors.push(`${label} ne peut pas être dans le futur.`)
    }
  }

  if (measurementType === 'VOLUME' && row.periodStartDate && row.periodEndDate && row.periodEndDate < row.periodStartDate) {
    errors.push('La date de fin doit être postérieure ou égale à la date de début.')
  }

  return errors
}

export function buildQuickEditorDraft(declaration, rows, measurementType, maxDate = formatDateInput(new Date())) {
  const entries = []
  const errors = []
  const originalRows = new Map(declaration.entries.map(entry => [entry.id, entry]))
  const changed = rows.some(row => hasQuickEntryChanged(originalRows.get(row.id), row, measurementType, declaration.measurementType))
  for (const row of rows) {
    if (row.removed) continue
    const dates = getQuickMeasurementDates(measurementType, row)
    const rowErrors = getQuickDateErrors(measurementType, dates, maxDate)
    const value = Number(row.value)
    if (row.value === '' || String(row.value).endsWith('.') || !Number.isFinite(value) || value < 0) {
      rowErrors.push('Renseignez une valeur positive ou nulle.')
    }
    errors.push(...rowErrors.map(message => `${row.pointName || 'Point'} — ${message}`))
    entries.push({
      id: row.id,
      pointPrelevementId: row.pointPrelevementId,
      exploitationId: row.exploitationId,
      usageId: row.usageId,
      value,
      ...dates
    })
  }

  return {
    changed,
    errors,
    payload: changed && errors.length === 0 ? {measurementType, revision: declaration.revision, entries} : null
  }
}
