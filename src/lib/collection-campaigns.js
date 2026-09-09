export const CAMPAIGN_STATUS_LABELS = {
  DRAFT: 'Brouillon', OPEN: 'Ouverte', CLOSED: 'Clôturée', SUBMITTED: 'Transmis'
}
export const CAMPAIGN_KIND_LABELS = {INDEX: 'Relevés de compteurs', NEEDS: 'Besoins en eau'}

export function campaignResponseHref(campaignId, kind, preleveurUserId) {
  if (!campaignId || !['INDEX', 'NEEDS'].includes(kind)) {
    return null
  }

  const query = new URLSearchParams(preleveurUserId ? {preleveurUserId} : {})
  return `/${kind === 'INDEX' ? 'mes-index' : 'mes-besoins'}/${encodeURIComponent(campaignId)}${query.size > 0 ? `?${query}` : ''}`
}

export function confirmCampaignAction(message) {
  // Native confirmation also blocks browser/SPA navigation before losing unsaved edits.
  // eslint-disable-next-line no-alert
  return window.confirm(message)
}

export function campaignPointChangeMailto({campaign, target, message}) {
  const email = campaign?.ownerContact?.email
  if (typeof email !== 'string' || !/^[^\s<>?,;]+@[^\s<>?,;]+\.[^\s<>?,;]+$/.test(email) || !message?.trim()) {
    return null
  }

  const subject = `[${campaign.name}] Demande d’ajout ou modification de point`
  const body = `Campagne : ${campaign.name} (${campaign.year})\nPoint : ${target ? campaignPointName(target) : 'Point manquant / nouveau point'}\n\n${message.trim()}`
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function unwrapCampaignResult(result) {
  if (!result?.success || result.data?.success === false) {
    const error = new Error(result?.error || result?.data?.message || 'La demande n’a pas abouti.')
    error.code = result?.code
    error.details = result?.data
    throw error
  }

  return result.data?.data ?? result.data
}

export function campaignArray(value) {
  return Array.isArray(value) ? value : value?.items ?? []
}

export function campaignDate(value, withTime = false, timeZone = 'Europe/Paris') {
  if (!value) {
    return 'Non renseignée'
  }

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return 'Date invalide'
  }

  return new Intl.DateTimeFormat('fr-FR', {dateStyle: 'short', ...(withTime ? {timeStyle: 'short'} : {}), timeZone: withTime ? timeZone : 'UTC'}).format(date)
}

export function decimalInput(value) {
  return String(value ?? '').replaceAll(/[\s\u00A0\u202F]/g, '').replace(',', '.')
}

export function isNonNegativeDecimal(value) {
  return /^(?:0|[1-9]\d{0,15})(?:\.\d{1,4})?$/.test(decimalInput(value))
}

export function campaignInclusiveEnd(value) {
  if (!value) {
    return ''
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export function campaignExclusiveEnd(value) {
  if (!value) {
    return ''
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export function campaignWallTime(value, timeZone) {
  if (!value) {
    return ''
  }

  const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function campaignDeadlineLabel(value, timeZone = 'Europe/Paris') {
  if (!value) {
    return 'Aucune date limite définie'
  }

  const wallTime = campaignWallTime(value, timeZone)
  return wallTime.endsWith('T00:00')
    ? `${campaignDate(campaignInclusiveEnd(wallTime))} inclus`
    : campaignDate(value, true, timeZone)
}

export function campaignInstant(value, timeZone) {
  if (!value) {
    return null
  }

  // Resolve the configured wall-clock time, never the browser/server timezone.
  const wallClock = Date.parse(`${value}:00Z`)
  let candidate = wallClock
  for (let index = 0; index < 3; index++) {
    candidate += wallClock - Date.parse(`${campaignWallTime(candidate, timeZone)}:00Z`)
  }

  if (campaignWallTime(candidate, timeZone) !== value || [-3_600_000, 3_600_000].some(offset => campaignWallTime(candidate + offset, timeZone) === value)) {
    throw new Error('Cette heure est inexistante ou ambiguë au changement d’heure. Choisissez un autre horaire.')
  }

  return new Date(candidate).toISOString()
}

export function campaignPointName(target) {
  const point = target.pointPrelevement ?? target.point ?? {}
  return point.usageName || point.name || target.pointName || 'Point de prélèvement'
}

export function campaignMeterName(meter) {
  const compteur = meter.compteur ?? meter
  return compteur.serialNumber || compteur.identifier || compteur.name || 'Compteur'
}

export function readingKey(reading) {
  return `${reading.targetId}:${reading.compteurId ?? null}:${reading.readingDate.slice(0, 10)}`
}

export function campaignPointReadings(draft, targetId) {
  return (draft.readings || []).filter(reading => reading.targetId === targetId && reading.compteurId === null && reading.value !== null && reading.value !== '')
}

export function campaignPointMeterConfirmed(draft, targetId) {
  const readings = campaignPointReadings(draft, targetId)
  return readings.length > 0 && readings.every(reading => reading.meterConfirmed === true)
}

export function campaignConfirmPointMeter(draft, targetId, confirmed) {
  return {
    ...draft, readings: (draft.readings || []).map(reading => reading.targetId === targetId && reading.compteurId === null
      ? {...reading, meterConfirmed: confirmed}
      : reading)
  }
}

export function campaignUpdateReading(draft, reading) {
  const updated = {...draft, readings: replaceCampaignRow(draft.readings || [], reading, readingKey)}
  // A new value or historical source must not inherit an earlier declaration of continuity.
  return reading.compteurId === null ? campaignConfirmPointMeter(updated, reading.targetId, false) : updated
}

export function campaignCalculationIssue(issue) {
  const messages = {
    METER_CONTINUITY_CONFIRMATION_REQUIRED: 'Confirmez que les relevés concernent le même compteur.',
    MISSING_READING: 'Renseignez cet index ou indiquez pourquoi il est indisponible.',
    MISSING_REASON_REQUIRED: 'Indiquez pourquoi ce relevé est indisponible.',
    NEGATIVE_DELTA_REQUIRES_EVENT: 'L’index a diminué. Vérifiez la saisie ou signalez un changement de compteur.',
    EXISTING_READING_REFERENCE_REQUIRED: 'Un relevé existe déjà à cette date : reprenez-le ou corrigez-le.',
    AMBIGUOUS_HISTORICAL_METER: 'Confirmez le compteur concerné par le relevé repris.',
    STALE_SOURCE_READING: 'Le relevé repris a été modifié. Rechargez la page pour le vérifier.',
    SOURCE_READING_CHANGED: 'Le relevé repris a changé. Vérifiez-le avant de transmettre.',
    CORRECTION_REASON_REQUIRED: 'Expliquez pourquoi vous corrigez ce relevé.',
    INVALID_INDEX: 'Saisissez un index positif ou nul.',
    METER_TRANSITION_REQUIRED: 'Précisez les relevés avant et après le changement de compteur.',
    PARTIAL_VOLUME_OVERLAP: 'Un volume existe déjà sur une partie de cette période. L’organisateur doit le vérifier.',
    AMBIGUOUS_VOLUME_OWNER: 'Un volume existant doit être vérifié par l’organisateur.'
  }
  return issue.reason || messages[issue.code] || 'Ce relevé doit être vérifié avant de calculer le volume.'
}

export function needKey(need) {
  return `${need.targetId}:${need.periodId}`
}

export function replaceCampaignRow(rows, value, key) {
  const entryKey = key(value)
  return [...rows.filter(row => key(row) !== entryKey), value]
}

export function getCampaignCapabilities(context, kind) {
  const response = context?.responses?.[kind]
  const permissions = {...context?.permissions, ...response?.permissions}
  return {
    canRead: permissions.canRead === true,
    canManage: permissions.canManage === true,
    canExport: permissions.canExport === true,
    canRemind: permissions.canRemind === true,
    canEdit: permissions.canEdit === true,
    canSubmit: permissions.canSubmit === true,
    canReopen: permissions.canReopen === true
  }
}

export function campaignEditableTargets(context, kind) {
  return context?.responses?.[kind]?.permissions?.editableTargetIds ?? context?.editableTargetIds ?? []
}

export function campaignDraftForSave(context, kind, draft) {
  const allowed = new Set(campaignEditableTargets(context, kind))
  const result = structuredClone(draft)
  for (const key of ['readings', 'needs', 'meterEvents']) {
    if (Array.isArray(result[key])) {
      result[key] = result[key].filter(item => allowed.has(item.targetId))
    }
  }

  if (allowed.size < (context?.targets?.length || 0)) {
    delete result.comment
  }

  return result
}

export function campaignInitialDraft(context, kind) {
  const stored = context.responses?.[kind]?.draft
  if (stored && context.responses?.[kind]?.id) {
    return {...(kind === 'INDEX' ? {comment: '', readings: [], meterEvents: []} : {comment: '', needs: []}), ...structuredClone(stored)}
  }

  if (kind === 'NEEDS') {
    return {comment: '', needs: []}
  }

  const candidates = context.existingReadings ?? []
  const readings = candidates.filter(reading => reading.compteurId && !reading.requiresMeterConfirmation
    && candidates.filter(candidate => readingKey(candidate) === readingKey(reading)).length === 1)
    .map(reading => campaignReferenceReading(reading, reading.compteurId))
  return {comment: '', readings, meterEvents: []}
}

export function campaignReferenceReading(source, compteurId) {
  return {
    targetId: source.targetId,
    compteurId,
    readingDate: source.readingDate.slice(0, 10),
    value: String(source.value),
    sourceChunkValueId: source.sourceChunkValueId,
    sourceValueUpdatedAt: source.sourceValueUpdatedAt,
    ...(source.requiresMeterConfirmation && compteurId ? {meterConfirmed: true} : {})
  }
}

export function campaignDraftErrors(draft, kind) {
  const errors = []
  const entries = kind === 'INDEX' ? draft.readings ?? [] : draft.needs ?? []
  for (const entry of entries) {
    if (kind === 'INDEX') {
      if (entry.value !== null && entry.value !== '' && !isNonNegativeDecimal(entry.value)) {
        errors.push('Saisissez un index positif ou nul, par exemple 1 234,5.')
      }
    } else if ([entry.requestedFlow, entry.requestedVolume].some(value => value !== '' && value !== null && !isNonNegativeDecimal(value))) {
      errors.push('Les débits et volumes demandés doivent être positifs ou nuls.')
    }
  }

  for (const event of draft.meterEvents ?? []) {
    if ((event.previousIndex !== null && !isNonNegativeDecimal(event.previousIndex)) || (event.nextIndex !== null && !isNonNegativeDecimal(event.nextIndex)) || !event.reason?.trim()) {
      errors.push('Pour chaque changement de compteur, renseignez les index avant et après, ou indiquez qu’ils sont indisponibles, puis précisez la raison.')
    }
  }

  return [...new Set(errors)]
}

export function meterAppliesOnDate(meter, date) {
  return (!meter.startDate || meter.startDate.slice(0, 10) <= date) && (!meter.endDate || meter.endDate.slice(0, 10) >= date)
}
