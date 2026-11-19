const indexTypes = new Set(['index', "relevé d'index"])
const volumeTypes = new Set(['volume', 'volume prélevé', 'volume rejeté'])

export function isVolumeMetricType(code) {
  return volumeTypes.has(code)
}

export function isIndexMetricType(code) {
  return indexTypes.has(code)
}

export function isDeclaredIndexValue(value) {
  return isIndexMetricType(value?.metricTypeCode) && (!value.valueKind || value.valueKind === 'DECLARED')
}

export function getDeclaredIndexDate(value, chunk, source, indexCount = 1) {
  const valueDate = value?.periodStart ?? value?.periodEnd
  // Campaign chunks have one business date. Older chunks can hold several readings.
  if (valueDate && indexCount > 1) return valueDate
  return chunk.metadata?.readingDate ?? valueDate ?? source.metadata?.readingDate ?? chunk.minDate ?? chunk.maxDate
}

function meterGroupKey(chunk) {
  const point = chunk.pointPrelevementId ?? chunk.pointPrelevement?.id
  const meter = chunk.compteurId ?? chunk.compteur?.id
  const serial = chunk.compteur?.serialNumber || chunk.serialNumber || chunk.metadata?.serialNumber
  if (point && (meter || serial)) return JSON.stringify([point, meter ? 'id' : 'serial', meter || serial])
  return chunk.id
}

function compareDates(a, b) {
  return (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0)
}

function readingKey(value, date) {
  if (value.id) return value.id
  return JSON.stringify([String(date ?? '').slice(0, 10), String(value.value), value.unit])
}

function buildGroupReadings(chunks, source, {allowLegacyHistory = true} = {}) {
  const readings = []
  const history = new Map()
  for (const chunk of chunks) {
    const values = (chunk.chunkValues ?? []).filter(isDeclaredIndexValue)
    for (const value of values) {
      const date = getDeclaredIndexDate(value, chunk, source, values.length)
      readings.push({key: readingKey(value, date), date, value, usage: chunk.usage})
    }
    const indexes = chunk.quickReadingHistory?.indexes ?? (allowLegacyHistory ? chunk.latestIndexReadings : [])
    for (const value of indexes ?? []) {
      const date = value.readingDate ?? value.periodStart ?? value.periodEnd
      const key = readingKey(value, date)
      history.set(key, {key, date, value})
    }
  }
  for (const {key} of readings) history.delete(key)
  return {
    readings: readings.sort(compareDates),
    history: [...history.values()].sort((a, b) => compareDates(b, a))
  }
}

function getCalculatedVolumes(chunks, replaced) {
  return chunks.flatMap(chunk => chunk.chunkValues ?? [])
    .filter(value => value.valueKind === 'COMPUTED' && isVolumeMetricType(value.metricTypeCode)
      && (replaced || (!value.isOverwritten && value.valueStatus !== 'OVERWRITTEN')))
    .sort((a, b) => Date.parse(a.periodEnd) - Date.parse(b.periodEnd))
}

export function getDeclarationDetailItems(source) {
  if (source.metadata?.manualQuickDeclaration !== true) return source.chunks.map(chunk => ({chunk}))
  const items = []
  const groups = new Map()
  const ordinary = !source.metadata.collectionCampaignId && !source.metadata.collectionResponseId
  for (const chunk of source.chunks) {
    if (chunk.metadata?.nativeTemporal) {
      items.push({chunk})
      continue
    }
    const values = chunk.chunkValues ?? []
    const replaced = ordinary && (source.globalInstructionStatus === 'REJECTED' || source.status === 'REJECTED' || chunk.instructionStatus === 'REJECTED')
    const declared = values.filter(value => !value.valueKind || value.valueKind === 'DECLARED')
    const measurement = chunk.metadata?.measurementType ?? source.metadata?.measurementType
    const isIndexChunk = declared.length ? declared.every(isDeclaredIndexValue) : measurement === 'INDEX'
    if (!isIndexChunk) {
      const isVolumeChunk = declared.length
        ? declared.every(value => isVolumeMetricType(value.metricTypeCode))
        : ['VOLUME', 'VOLUME_PRELEVE', 'VOLUME_REJETE'].includes(measurement)
      if (ordinary && isVolumeChunk) {
        // On a volume receipt, use only the history scoped to this point, operator and meter.
        const {history} = buildGroupReadings([chunk], source, {allowLegacyHistory: false})
        items.push({chunk, replaced, declaredVolumes: declared, history,
          volumeHistory: chunk.quickReadingHistory?.volumes ?? [], following: chunk.quickReadingHistory?.following})
      } else {
        items.push({chunk})
      }
      continue
    }

    // A replaced lot has its own receipt detail even when the meter also has active readings.
    const key = ordinary
      ? JSON.stringify([meterGroupKey(chunk), chunk.exploitationId, chunk.preleveurUserId, replaced])
      : meterGroupKey(chunk)
    if (!groups.has(key)) {
      const group = []
      groups.set(key, group)
      items.push({chunk, group, replaced})
    }
    groups.get(key).push(chunk)
  }
  return items.map(item => {
    if (!item.group) return item
    const {chunk, group, replaced} = item
    const calculatedVolumes = ordinary ? getCalculatedVolumes(group, replaced) : undefined
    const volumeHistory = ordinary ? group.flatMap(entry => entry.quickReadingHistory?.volumes ?? []) : []
    const following = ordinary && !replaced ? {
      indexes: group.flatMap(entry => entry.quickReadingHistory?.following?.indexes ?? []),
      volumes: group.flatMap(entry => entry.quickReadingHistory?.following?.volumes ?? [])
    } : undefined
    return {chunk, ...buildGroupReadings(group, source), calculatedVolumes, volumeHistory, following, replaced}
  })
}
