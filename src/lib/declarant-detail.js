export function getDeclarantRole(declarant) {
  return declarant?.declarantRole || declarant?.declarant?.declarantRole || 'PRELEVEUR'
}

export function isCollecteurDeclarant(declarant) {
  return getDeclarantRole(declarant) === 'COLLECTEUR'
}

export function getExploitationPointId(exploitation) {
  return exploitation?.pointPrelevement?.id || exploitation?.pointPrelevementId || null
}

function getExploitationKey(exploitation) {
  return exploitation?.id || [
    exploitation?.declarantUserId || exploitation?.declarant?.userId || exploitation?.declarant?.id,
    getExploitationPointId(exploitation)
  ].filter(Boolean).join(':') || null
}

export function getCollecteurManagedExploitations(declarant) {
  return (declarant?.collecteurExploitations ?? [])
    .map(link => {
      const exploitation = link?.exploitation

      if (!exploitation) {
        return null
      }

      return {
        ...exploitation,
        collecteurLink: {
          id: link.id,
          createdAt: link.createdAt,
          updatedAt: link.updatedAt
        }
      }
    })
    .filter(Boolean)
}

export function getDeclarantDetailExploitations(declarant) {
  const directExploitations = declarant?.pointPrelevements ?? []

  if (!isCollecteurDeclarant(declarant)) {
    return directExploitations
  }

  const byKey = new Map()
  let fallbackIndex = 0

  for (const exploitation of [
    ...directExploitations,
    ...getCollecteurManagedExploitations(declarant)
  ]) {
    const key = getExploitationKey(exploitation) ?? `fallback:${fallbackIndex}`
    fallbackIndex += 1

    if (!byKey.has(key)) {
      byKey.set(key, exploitation)
    }
  }

  return [...byKey.values()]
}

export function getExploitationPointIds(exploitations) {
  return [
    ...new Set(
      (exploitations ?? [])
        .map(exploitation => getExploitationPointId(exploitation))
        .filter(Boolean)
    )
  ]
}

export function getDeclarantSeriesScope(declarant, declarantId, pointIds = []) {
  if (isCollecteurDeclarant(declarant)) {
    return pointIds.length > 0 ? {pointIds} : null
  }

  return declarantId ? {preleveurId: declarantId} : null
}

export function hasDeclarantContactInfo(declarant) {
  return Boolean(
    declarant?.email
    || declarant?.phoneNumber
    || declarant?.addressLine1
    || declarant?.addressLine2
    || declarant?.postalCode
    || declarant?.city
  )
}
