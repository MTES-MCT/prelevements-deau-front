'use client'

import {listDeclarantEmailAliasesAction} from '@/server/actions/declarants.js'

function getDeclarantId(declarant) {
  return declarant?.id || declarant?.userId || declarant?.user?.id || declarant?.declarant?.userId || null
}

function alreadyHasAliases(declarant) {
  return Array.isArray(declarant?.emailAliases) || Array.isArray(declarant?.user?.emailAliases)
}

async function getAliasesForDeclarant(declarant, cache) {
  const declarantId = getDeclarantId(declarant)

  if (!declarantId) {
    return []
  }

  if (cache.has(declarantId)) {
    return cache.get(declarantId)
  }

  const response = await listDeclarantEmailAliasesAction(declarantId)
  const aliases = response.success ? response.data?.emailAliases ?? [] : []

  cache.set(declarantId, aliases)

  return aliases
}

async function withDeclarantEmailAliases(declarant, cache) {
  if (!declarant || alreadyHasAliases(declarant)) {
    return declarant
  }

  const aliases = await getAliasesForDeclarant(declarant, cache)

  return {
    ...declarant,
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
