import {formatDateInput, parseDateInput} from './date-range.js'
import {withCountingCode} from './exploitation-identity.js'

export function switchQuickRowValue(row, from, to) {
  if (row.value === '') return {...row, valueDrafts: {}}
  const valueDrafts = {...row.valueDrafts, [from]: row.value}
  return {...row, valueDrafts, value: valueDrafts[to] ?? row.value}
}

export function createQuickEditorRows(declaration) {
  const rows = declaration.entries.map(entry => ({...entry, value: String(entry.value), removed: false}))
  const occupied = new Set(rows.map(rowExploitationId))
  for (const entry of declaration.emptyEntries ?? []) {
    if (!entry.exploitationId || occupied.has(entry.exploitationId)) continue
    occupied.add(entry.exploitationId)
    rows.push({...entry, value: '', removed: false})
  }
  return rows
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

export function hasQuickEditorMeasure(row) {
  return !row.removed && row.value !== ''
}

export function getQuickMeasureBadge(original, row, measurementType, originalType) {
  if (!hasQuickEditorMeasure(row)) return original ? 'Supprimé' : null
  if (!original) return 'Ajouté'
  return measurementType !== originalType || Number(row.value) !== Number(original.value) ? 'Modifié' : null
}

export function getQuickEditorMapPoints(declaration) {
  const byId = new Map((declaration.mapPoints ?? []).map(point => [point.pointPrelevementId ?? point.id, point]))
  const points = new Map()
  for (const row of [...declaration.entries, ...(declaration.emptyEntries ?? [])]) {
    const id = row.pointPrelevementId
    if (!id || points.has(id)) continue
    const point = byId.get(id)
    points.set(id, {pointPrelevementId: id, name: point?.name || row.pointName, coordinates: point?.coordinates ?? null})
  }
  return [...points.values()]
}

// The form stores values by row. A historical row can share both a point and
// an exploitation with another meter, so its persisted entry ID is the row key.
export function getQuickCorrectionFormContext(declaration) {
  const fixedRows = createQuickEditorRows(declaration)
  const geometry = new Map(getQuickEditorMapPoints(declaration).map(point => [point.pointPrelevementId, point.coordinates]))
  const originals = new Map(declaration.entries.map(entry => [entry.id, entry]))
  const initial = getQuickEditorInitialDates(declaration)
  const labels = fixedRows.map(getQuickEditorLabel)
  const repeatedLabels = new Set()
  const knownLabels = new Set()
  for (const label of labels) {
    if (knownLabels.has(label)) repeatedLabels.add(label)
    knownLabels.add(label)
  }
  const points = fixedRows.map((row, index) => ({
    ...row,
    formEntryId: getQuickEditorRowKey(row),
    name: row.pointName,
    coordinates: geometry.get(row.pointPrelevementId),
    usage: {id: row.usageId, label: row.usageLabel},
    lastReading: row.previousReading,
    declarationsCount: row.id ? 1 : 0,
    correction: {
      label: repeatedLabels.has(labels[index]) ? `${labels[index]} · ligne ${index + 1}` : labels[index],
      original: originals.get(row.id),
      originalType: declaration.measurementType,
      showOriginalDates: initial.requiresDateSelection
    }
  }))
  const rows = Object.fromEntries(points.map(point => [point.formEntryId, {value: point.value, usageId: point.usageId}]))
  return {context: {points}, rows, initial}
}

export function getQuickMeasurementDates(measurementType, row) {
  return measurementType === 'INDEX'
    ? {readingDate: row.readingDate}
    : {periodStartDate: row.periodStartDate, periodEndDate: row.periodEndDate}
}

export function getQuickEditorInitialDates(declaration) {
  const dates = {readingDate: '', periodStartDate: '', periodEndDate: ''}
  const [first, ...others] = declaration.entries
  if (!first) return {dates, requiresDateSelection: false}
  const original = getQuickMeasurementDates(declaration.measurementType, first)
  const requiresDateSelection = declaration.requiresDateSelection === true || Object.keys(original).some(field =>
    others.some(entry => entry[field] !== first[field]))
  if (!requiresDateSelection) {
    for (const field of Object.keys(original)) dates[field] = first[field] ?? declaration[field] ?? ''
  }
  return {dates, requiresDateSelection}
}

export function hasQuickEntryChanged(entry, row, measurementType, originalType, dates) {
  if (!entry) return hasQuickEditorMeasure(row)
  if (measurementType !== originalType || !hasQuickEditorMeasure(row) || Number(row.value) !== Number(entry.value)) {
    return true
  }

  return Object.values(dates).every(Boolean) && Object.entries(dates).some(([field, value]) => value !== entry[field])
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

export function buildQuickEditorDraft(declaration, rows, measurementType, draftDates, maxDate = formatDateInput(new Date())) {
  const entries = []
  const dates = getQuickMeasurementDates(measurementType, draftDates)
  const errors = rows.some(hasQuickEditorMeasure) ? getQuickDateErrors(measurementType, dates, maxDate) : []
  const reviewEntries = []
  const originalRows = new Map(declaration.entries.map(entry => [entry.id, entry]))
  for (const row of rows) {
    const value = Number(row.value)
    const original = originalRows.get(row.id)
    const label = getQuickEditorLabel(row)
    const active = hasQuickEditorMeasure(row)
    if (hasQuickEntryChanged(original, row, measurementType, declaration.measurementType, dates)) {
      reviewEntries.push({
        id: row.id,
        pointPrelevementId: row.pointPrelevementId,
        exploitationId: rowExploitationId(row),
        compteurId: row.compteurId ?? null,
        label,
        before: original ? {type: declaration.measurementType, value: original.value, ...getQuickMeasurementDates(declaration.measurementType, original)} : null,
        after: active ? {type: measurementType, value, ...dates} : null
      })
    }
    if (!active) continue
    if (String(row.value).endsWith('.') || !Number.isFinite(value) || value < 0) {
      errors.push(`${label} — Renseignez une valeur positive ou nulle.`)
    }
    entries.push({
      ...(row.id ? {id: row.id} : {}),
      pointPrelevementId: row.pointPrelevementId,
      exploitationId: row.exploitationId,
      usageId: row.usageId,
      value
    })
  }

  const changed = reviewEntries.length > 0
  // Removed measures have no entry in the submitted values. Keep their place in the receipt.
  const receiptOrder = declaration.supportsReceiptRowOrder && reviewEntries.some(entry => !entry.after)
    ? {receiptRowOrder: rows.filter(row => row.id || hasQuickEditorMeasure(row)).map(row => row.id ? {id: row.id} : {exploitationId: row.exploitationId})}
    : {}
  return {
    changed,
    errors,
    reviewEntries,
    payload: changed && errors.length === 0 ? {measurementType, revision: declaration.revision, ...(entries.length > 0 ? dates : {}), entries, ...receiptOrder} : null
  }
}
