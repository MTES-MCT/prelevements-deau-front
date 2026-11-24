import {formatDateInput, parseDateInput} from './date-range.js'
import {withCountingCode} from './exploitation-identity.js'

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

export function getQuickEditorRowKey(row) {
  return row.id ?? `new:${row.exploitationId}`
}

export function getQuickEditorLabel(row) {
  const point = withCountingCode(row.pointName || 'Point de prélèvement', row)
  const meter = row.compteurName || row.serialNumber
  return meter ? `${point} · compteur ${meter}` : point
}

function rowExploitationId(row) {
  return row.exploitationId ?? row.effectiveExploitationId ?? null
}

export function getQuickEditorOptions(availableEntries = [], rows) {
  const options = new Map()
  for (const entry of availableEntries) {
    const id = entry.exploitationId
    if (!id || options.has(id)) continue
    const existing = rows.filter(row => rowExploitationId(row) === id)
    if (existing.some(row => !row.removed) || existing.length > 1) continue
    options.set(id, {entry, restoreId: existing[0]?.id ?? null})
  }
  return [...options.values()]
}

export function addQuickEditorRow(rows, option) {
  if (option.restoreId) return rows.map(row => row.id === option.restoreId ? {...row, removed: false} : row)
  if (rows.some(row => rowExploitationId(row) === option.entry.exploitationId)) return rows
  return [...rows, {...option.entry, readingDate: '', periodStartDate: '', periodEndDate: '', value: '', removed: false}]
}

export function getQuickMeasurementDates(measurementType, row) {
  return measurementType === 'INDEX'
    ? {readingDate: row.readingDate}
    : {periodStartDate: row.periodStartDate, periodEndDate: row.periodEndDate}
}

export function hasQuickEntryChanged(entry, row, measurementType, originalType) {
  if (!entry || measurementType !== originalType || row.removed || row.value === '' || Number(row.value) !== Number(entry.value)) {
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
  const reviewEntries = []
  const originalRows = new Map(declaration.entries.map(entry => [entry.id, entry]))
  for (const row of rows) {
    const dates = getQuickMeasurementDates(measurementType, row)
    const value = Number(row.value)
    const original = originalRows.get(row.id)
    const label = getQuickEditorLabel(row)
    if ((original || !row.removed) && hasQuickEntryChanged(original, row, measurementType, declaration.measurementType)) {
      reviewEntries.push({
        id: row.id,
        pointPrelevementId: row.pointPrelevementId,
        exploitationId: rowExploitationId(row),
        compteurId: row.compteurId ?? null,
        label,
        before: original ? {type: declaration.measurementType, value: original.value, ...getQuickMeasurementDates(declaration.measurementType, original)} : null,
        after: row.removed ? null : {type: measurementType, value, ...dates}
      })
    }
    if (row.removed) continue
    const rowErrors = getQuickDateErrors(measurementType, dates, maxDate)
    if (row.value === '' || String(row.value).endsWith('.') || !Number.isFinite(value) || value < 0) {
      rowErrors.push('Renseignez une valeur positive ou nulle.')
    }
    errors.push(...rowErrors.map(message => `${label} — ${message}`))
    entries.push({
      ...(row.id ? {id: row.id} : {}),
      pointPrelevementId: row.pointPrelevementId,
      exploitationId: row.exploitationId,
      usageId: row.usageId,
      value,
      ...dates
    })
  }

  const changed = reviewEntries.length > 0
  return {
    changed,
    errors,
    reviewEntries,
    payload: changed && errors.length === 0 ? {measurementType, revision: declaration.revision, entries} : null
  }
}
