export const CAMPAIGN_POINT_LIMIT = 5000

export const campaignExploitationId = detail => detail?.exploitationId || detail?.id
export const campaignSelectionPointId = detail => detail?.pointPrelevementId || detail?.pointPrelevement?.id
export const campaignPointIsExternal = detail => detail?.pointPrelevement?.collectionMode === 'EXTERNAL'

export function campaignPreleveurLabel(detail) {
  const person = detail?.preleveur || detail?.declarant || {}
  return person.label || person.socialReason || [person.firstName || person.user?.firstName, person.lastName || person.user?.lastName].filter(Boolean).join(' ') || person.email || 'Préleveur'
}

export function campaignPointUsageLabel(detail) {
  return detail?.usage?.name || detail?.usage?.label || 'Usage non renseigné'
}

export function campaignPointScopeKey({zoneId, ownerCollecteurUserId, q, usageId}) {
  return JSON.stringify([zoneId || '', ownerCollecteurUserId || '', q || '', usageId || ''])
}

export function campaignSelectionDetails(knownTargets, results) {
  return new Map([...knownTargets, ...results.map(item => [campaignExploitationId(item), item])])
}

export function campaignSelectedPointCount(targets, knownTargets) {
  return new Set(targets.map(item => campaignSelectionPointId(knownTargets.get(item.exploitationId)) || item.exploitationId)).size
}

export function campaignPointSelectionState(detail, targets, knownTargets) {
  const id = campaignExploitationId(detail)
  const selection = targets.find(item => item.exploitationId === id)
  const pointId = campaignSelectionPointId(detail)
  const duplicate = targets.some(item => item.exploitationId !== id && campaignSelectionPointId(knownTargets.get(item.exploitationId)) === pointId)
  return {selection, duplicate, external: campaignPointIsExternal(detail)}
}

export function toggleCampaignPoint(targets, detail, knownTargets, included) {
  const id = campaignExploitationId(detail)
  if (!included) {
    return targets.filter(item => item.exploitationId !== id)
  }

  const {selection, duplicate, external} = campaignPointSelectionState(detail, targets, knownTargets)
  if (!id || !campaignSelectionPointId(detail) || external || duplicate) {
    return targets
  }

  if (selection) {
    return targets.map(item => item.exploitationId === id ? {...item, eligibilityConfirmed: true} : item)
  }

  if (targets.length >= CAMPAIGN_POINT_LIMIT) {
    throw new Error('Vous pouvez sélectionner jusqu’à 5 000 points par campagne.')
  }

  return [...targets, {exploitationId: id, eligibilityConfirmed: true}]
}

export function selectCampaignPointResults(targets, results, knownTargets, included = true) {
  const rows = [...new Map(results.map(item => [campaignExploitationId(item), item])).values()]
  const resultIds = new Set(rows.map(row => campaignExploitationId(row)))
  if (!included) {
    return {targets: targets.filter(item => !resultIds.has(item.exploitationId)), skippedAmbiguous: 0, skippedExternal: 0}
  }

  const details = campaignSelectionDetails(knownTargets, rows)
  const pointCounts = new Map()
  for (const row of rows) {
    const pointId = campaignSelectionPointId(row)
    pointCounts.set(pointId, (pointCounts.get(pointId) || 0) + 1)
  }

  const selectedIds = new Set(targets.map(item => item.exploitationId))
  const selectedPointIds = new Set(targets.map(item => campaignSelectionPointId(details.get(item.exploitationId))).filter(Boolean))
  const skippedAmbiguous = new Set()
  const skippedExternal = new Set()
  const added = []
  const confirmed = new Set()
  for (const row of rows) {
    const id = campaignExploitationId(row)
    const pointId = campaignSelectionPointId(row)
    if (!id || !pointId) {
      continue
    }

    if (campaignPointIsExternal(row)) {
      skippedExternal.add(pointId)
      continue
    }

    if (selectedIds.has(id)) {
      confirmed.add(id)
    } else if (row.ambiguousPoint || pointCounts.get(pointId) > 1 || selectedPointIds.has(pointId)) {
      skippedAmbiguous.add(pointId)
    } else {
      added.push({exploitationId: id, eligibilityConfirmed: true})
      selectedPointIds.add(pointId)
    }
  }

  if (targets.length + added.length > CAMPAIGN_POINT_LIMIT) {
    throw new Error('Ces résultats dépassent la limite de 5 000 points par campagne. Affinez la recherche ou le filtre d’usage.')
  }

  return {
    targets: [...targets.map(item => confirmed.has(item.exploitationId) ? {...item, eligibilityConfirmed: true} : item), ...added],
    skippedAmbiguous: skippedAmbiguous.size,
    skippedExternal: skippedExternal.size
  }
}

export async function loadCampaignPointResults({fetchPage, params, isCurrent = () => true}) {
  const results = new Map()
  const seenCursors = new Set()
  let cursor
  let total
  while (isCurrent()) {
    // Each opaque cursor is supplied by the preceding page, so requests are sequential.

    const page = await fetchPage({...params, limit: 500, ...(cursor ? {cursor} : {})})
    if (!isCurrent()) {
      return null
    }

    const pageTotal = page.pagination?.total
    if (total !== undefined && pageTotal !== total) {
      throw new Error('La liste des points a changé pendant la recherche. Réessayez.')
    }

    total = pageTotal
    for (const item of page.exploitations || []) {
      results.set(campaignExploitationId(item), item)
    }

    if (!page.pagination?.hasMore) {
      if (total !== undefined && results.size !== total) {
        throw new Error('La liste des points a changé pendant la recherche. Réessayez.')
      }

      return [...results.values()]
    }

    cursor = page.pagination.nextCursor
    if (!cursor || seenCursors.has(cursor)) {
      throw new Error('Impossible de charger tous les résultats. Réessayez en précisant la recherche.')
    }

    seenCursors.add(cursor)
  }

  return null
}
