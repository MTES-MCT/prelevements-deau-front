'use client'

import {
  listDeclarantContactEmailsAction,
  listDeclarantEmailAliasesAction
} from '@/server/actions/declarants.js'

function getDeclarantId(declarant) {
  return declarant?.id || declarant?.userId || declarant?.user?.id || declarant?.declarant?.userId || null
}

async function loadContactEmails(declarantId) {
  const response = await listDeclarantContactEmailsAction(declarantId)
  return response.success ? response.data?.contactEmails ?? [] : []
}

async function loadEmailAliases(declarantId) {
  const response = await listDeclarantEmailAliasesAction(declarantId)
  return response.success ? response.data?.emailAliases ?? [] : []
}

async function getEmailsForDeclarant(declarant, cache, {includeContacts, includeAliases}) {
  const declarantId = getDeclarantId(declarant)

  if (!declarantId) {
    return {contactEmails: [], emailAliases: []}
  }

  let entry = cache.get(declarantId)
  if (!entry) {
    entry = {}
    cache.set(declarantId, entry)
  }

  if (includeContacts && !entry.contactEmails) {
    entry.contactEmails = loadContactEmails(declarantId)
  }

  if (includeAliases && !entry.emailAliases) {
    entry.emailAliases = loadEmailAliases(declarantId)
  }

  const [contactEmails, emailAliases] = await Promise.all([
    includeContacts ? entry.contactEmails : undefined,
    includeAliases ? entry.emailAliases : undefined
  ])

  return {contactEmails, emailAliases}
}

async function withDeclarantEmailAliases(declarant, cache) {
  if (!declarant) {
    return declarant
  }

  const hasAliases = Array.isArray(declarant.emailAliases) || Array.isArray(declarant.user?.emailAliases)
  const hasContacts = Array.isArray(declarant.contactEmails)

  if (hasAliases && hasContacts) {
    return declarant
  }

  const {contactEmails, emailAliases} = await getEmailsForDeclarant(declarant, cache, {
    includeContacts: !hasContacts,
    includeAliases: !hasAliases
  })
  const aliases = hasAliases
    ? declarant.emailAliases ?? declarant.user?.emailAliases ?? []
    : emailAliases

  return {
    ...declarant,
    contactEmails: hasContacts ? declarant.contactEmails : contactEmails,
    emailAliases: aliases,
    user: declarant.user
      ? {
        ...declarant.user,
        emailAliases: aliases
      }
      : declarant.user
  }
}

export async function withDeclarantsEmailAliases(declarants = []) {
  const cache = new Map()

  return Promise.all(
    declarants.map(declarant => withDeclarantEmailAliases(declarant, cache))
  )
}

export async function withExploitationsEmailAliases(exploitations = []) {
  const cache = new Map()

  return Promise.all(
    exploitations.map(async exploitation => {
      const declarant = await withDeclarantEmailAliases(exploitation.declarant, cache)
      const collecteurs = await Promise.all(
        (exploitation.collecteurs || []).map(async link => ({
          ...link,
          collecteur: await withDeclarantEmailAliases(link.collecteur, cache)
        }))
      )

      return {
        ...exploitation,
        declarant,
        collecteurs
      }
    })
  )
}
