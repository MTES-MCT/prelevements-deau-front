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

export function getDeclarantSeriesScope(declarant, declarantId) {
  if (isCollecteurDeclarant(declarant)) {
    return declarantId ? {collecteurId: declarantId} : null
  }

  return declarantId ? {preleveurId: declarantId} : null
}

export function getDeclarantContactEmails(declarant) {
  return (declarant?.contactEmails || declarant?.declarant?.contactEmails || [])
    .map(contact => typeof contact === 'string' ? {email: contact, isPrimary: false} : contact)
    .filter(contact => contact?.email)
}

function isSyntheticImportEmail(email) {
  return typeof email === 'string'
    && email.trim().toLowerCase().endsWith('@import.local')
}

export function getEffectiveDeclarantContactEmails(declarant) {
  const contacts = getDeclarantContactEmails(declarant)
    .filter(contact => !isSyntheticImportEmail(contact.email))
  const primary = contacts.find(contact => contact.isPrimary)

  if (contacts.length > 0) {
    return [...new Set([
      primary?.email,
      ...contacts.map(contact => contact.email)
    ].filter(Boolean))]
  }

  const fallback = [
    declarant?.loginEmail,
    declarant?.email,
    declarant?.user?.email
  ].find(email => email && !isSyntheticImportEmail(email))

  return fallback ? [fallback] : []
}

export function getPrimaryDeclarantContactEmail(declarant) {
  return getEffectiveDeclarantContactEmails(declarant)[0] ?? null
}

export function hasDeclarantContactInfo(declarant) {
  return Boolean(
    getPrimaryDeclarantContactEmail(declarant)
    || declarant?.phoneNumber
    || declarant?.addressLine1
    || declarant?.addressLine2
    || declarant?.postalCode
    || declarant?.city
  )
}
