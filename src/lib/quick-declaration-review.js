import {formatNumber} from '../utils/number.js'
import {parseDateInput} from './date-range.js'

const fullDay = new Intl.DateTimeFormat('fr-FR', {day: 'numeric', month: 'short', year: 'numeric'})
const dayOnly = new Intl.DateTimeFormat('fr-FR', {day: 'numeric'})
const dayMonth = new Intl.DateTimeFormat('fr-FR', {day: 'numeric', month: 'short'})
const byLabel = new Intl.Collator('fr-FR', {numeric: true, sensitivity: 'base'})

export function formatQuickDate(date) {
  return parseDateInput(date)?.toLocaleDateString('fr-FR') ?? 'Date inconnue'
}

export function formatReviewPeriod(start, end) {
  return start === end ? formatQuickDate(start) : `${formatQuickDate(start)} au ${formatQuickDate(end)}`
}

export function formatReviewVolume(value) {
  return value == null ? 'Aucun' : `${formatNumber(Number(value), {maximumFractionDigits: 10})} m³`
}

function measureDate(measure) {
  const start = measure.readingDate ?? measure.periodStartDate
  const end = measure.readingDate ?? measure.periodEndDate
  const first = parseDateInput(start)
  const last = parseDateInput(end)
  if (!first || !last) return 'à une date inconnue'
  const label = (date, formatter) => formatter.format(date).replace(/^1(?= |$)/, '1er')
  if (start === end) return `le ${label(first, fullDay)}`
  let fromFormat = fullDay
  if (first.getFullYear() === last.getFullYear()) {
    fromFormat = first.getMonth() === last.getMonth() ? dayOnly : dayMonth
  }
  return `du ${label(first, fromFormat)} au ${label(last, fullDay)}`
}

export function describeQuickMeasure({before, after}, warnings = []) {
  const measure = after ?? before
  const name = measure.type === 'INDEX' ? 'Index' : 'Volume'
  const describe = entry => `${formatReviewVolume(entry.value)} ${measureDate(entry)}`
  if (!before && after.type === 'INDEX' && warnings.some(w => w.code === 'INDEX_SAME_DATE' && w.readingDate === after.readingDate)) {
    return {action: 'Nouvel index retenu', detail: describe(after)}
  }
  if (!before && after.type === 'VOLUME' && warnings.some(w => w.code === 'VOLUME_OVERLAP' || w.code === 'DIRECT_VOLUME_PRIORITY')) {
    return {action: 'Volume déclaré retenu', detail: describe(after)}
  }
  if (!before || !after) return {action: `${name} ${after ? 'ajouté' : 'supprimé'}`, detail: describe(measure)}
  if (before.type !== after.type) {
    const action = after.type === 'INDEX' ? 'Volume remplacé par un index' : 'Index remplacé par un volume'
    return {action, detail: `${describe(before)} → ${describe(after)}`}
  }

  const dateChanged = measureDate(before) !== measureDate(after)
  const valueChanged = Number(before.value) !== Number(after.value)
  if (!dateChanged) {
    return {action: `${name} modifié`, detail: `${formatReviewVolume(before.value)} → ${describe(after)}`}
  }

  const isIndex = measure.type === 'INDEX'
  const action = valueChanged
    ? (isIndex ? 'Index et date modifiés' : 'Volume et période modifiés')
    : (isIndex ? 'Date du relevé modifiée' : 'Période modifiée')
  return {action, detail: valueChanged ? `${describe(before)} → ${describe(after)}` : `${describe(before)} → ${measureDate(after)}`}
}

function seriesKey(row) {
  return [row.pointPrelevementId, row.exploitationId || '', row.compteurId || ''].join('/')
}

export function getReviewLabel(row, labels) {
  const exploitation = row.exploitationId || row.pointPrelevementId
  return row.label || labels[`${exploitation}/${row.compteurId}`] || labels[exploitation] || row.pointName || 'Point de prélèvement'
}

export function groupQuickReview(entries, changes, warnings, labels = {}) {
  const groups = new Map()
  const groupFor = row => {
    const key = seriesKey(row)
    if (!groups.has(key)) groups.set(key, {key, label: getReviewLabel(row, labels), measures: [], changes: [], warnings: []})
    return groups.get(key)
  }

  for (const row of entries) groupFor(row).measures.push(row)
  for (const row of changes) groupFor(row).changes.push(row)
  for (const row of warnings) groupFor(row).warnings.push(row)
  return [...groups.values()].sort((a, b) => byLabel.compare(a.label, b.label))
}

function isDirectChange(measure, change) {
  const matches = (entry, value) => entry == null ? value == null : entry.type === 'VOLUME'
    && value != null && Number(entry.value) === Number(value)
    && entry.periodStartDate === change.periodStartDate && entry.periodEndDate === change.periodEndDate
  return matches(measure.before, change.before) && matches(measure.after, change.after)
}

export function describeQuickVolumes({measures, changes}) {
  const single = measures.length === 1 ? measures[0] : null
  if (!changes.length) {
    if (!measures.length) return null
    return single?.after?.type === 'INDEX' && !single.before
      ? 'Aucun nouveau volume calculé pour ce relevé.'
      : 'Les volumes comptabilisés restent identiques.'
  }

  if (changes.length === 1) {
    const [change] = changes
    // In a simple direct declaration the measurement already gives the amount and period.
    if (single && isDirectChange(single, change)) return null
    const period = measureDate({...change, type: 'VOLUME'})
    if (change.before == null) {
      const calculated = change.afterKind === 'COMPUTED' || (!change.afterKind && single?.after?.type === 'INDEX')
      return `Un volume de ${formatReviewVolume(change.after)} est ${calculated ? 'calculé' : 'comptabilisé'} ${period}.`
    }
    if (change.after == null) return `Le volume de ${formatReviewVolume(change.before)} est retiré ${period}.`
    if (change.beforeKind !== change.afterKind && change.before === change.after) {
      if (change.afterKind === 'DECLARED') return `Le volume reste de ${formatReviewVolume(change.after)} ${period}, désormais déclaré directement.`
      if (change.afterKind === 'COMPUTED') return `Le volume reste de ${formatReviewVolume(change.after)} ${period}, désormais calculé à partir des index.`
    }
    if (change.before === change.after) return `La répartition change. Le volume reste de ${formatReviewVolume(change.after)} ${period}.`
    return `Le volume passe de ${formatReviewVolume(change.before)} à ${formatReviewVolume(change.after)} ${period}.`
  }

  const periods = new Set(changes.map(row => `${row.periodStartDate}/${row.periodEndDate}`)).size
  const total = field => {
    const present = changes.filter(row => row[field] != null)
    return present.length ? present.reduce((sum, row) => sum + Number(row[field]), 0) : null
  }

  const before = total('before')
  const after = total('after')
  const scope = periods === 1 ? 'Sur la période concernée' : `Sur les ${periods} périodes concernées`
  if (before == null) return `${scope}, le volume ajouté est de ${formatReviewVolume(after)}.`
  if (after == null) return `${scope}, le volume retiré est de ${formatReviewVolume(before)}.`
  if (formatReviewVolume(before) === formatReviewVolume(after)) return `${scope}, le total reste de ${formatReviewVolume(after)}.`
  return `${scope}, le volume passe de ${formatReviewVolume(before)} à ${formatReviewVolume(after)}.`
}
