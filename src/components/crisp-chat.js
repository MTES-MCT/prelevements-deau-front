'use client'

import {useEffect, useRef} from 'react'

import {useAuth} from '@/contexts/auth-context.js'

const CRISP_WEBSITE_ID = '22b8b7d4-01e8-43e6-b2be-ba85c5624aeb'
let crispModulePromise

function loadCrisp() {
  crispModulePromise ||= import('crisp-sdk-web')
  return crispModulePromise
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== '')
  )
}

function getCrispUserName(user) {
  if (!user) {
    return null
  }

  return [user.firstName, user.lastName].filter(Boolean).join(' ')
    || user.socialReason
    || user.email
    || null
}

function getCrispUserIdentifier(user) {
  if (!user) {
    return null
  }

  return user.id && user.id !== 'anonymous' ? user.id : user.email
}

function getCrispSessionData(user) {
  if (!user) {
    return null
  }

  return compactObject({
    userId: user.id,
    role: user.role,
    declarantRole: user.declarantRole,
    declarantType: user.declarantType,
    structure: user.structure,
    socialReason: user.socialReason,
    impersonationActive: Boolean(user.impersonation?.active),
    impersonationActorId: user.impersonation?.actor?.id,
    impersonationTargetId: user.impersonation?.target?.id
  })
}

const CrispChat = ({disabled = false}) => {
  const {user, isLoading} = useAuth()
  const identifiedUserIdRef = useRef(null)

  useEffect(() => {
    if (disabled || isLoading) {
      return
    }

    let cancelled = false

    const configureCrisp = async () => {
      const {Crisp} = await loadCrisp()
      if (cancelled) {
        return
      }

      Crisp.configure(CRISP_WEBSITE_ID)
      Crisp.chat.show()

      const previousUserId = identifiedUserIdRef.current
      const userId = getCrispUserIdentifier(user)

      if (!user) {
        if (previousUserId) {
          Crisp.session.reset(false)
          identifiedUserIdRef.current = null
        }

        return
      }

      if (previousUserId && userId && previousUserId !== userId) {
        Crisp.session.reset(false)
      }

      if (user.email) {
        Crisp.user.setEmail(user.email)
      }

      const userName = getCrispUserName(user)
      if (userName) {
        Crisp.user.setNickname(userName)
      }

      const sessionData = getCrispSessionData(user)
      if (sessionData) {
        Crisp.session.setData(sessionData)
      }

      identifiedUserIdRef.current = userId
    }

    let timeoutId
    let idleCallbackId

    if ('requestIdleCallback' in window) {
      idleCallbackId = window.requestIdleCallback(configureCrisp, {timeout: 3000})
    } else {
      timeoutId = window.setTimeout(configureCrisp, 1500)
    }

    return () => {
      cancelled = true
      if (idleCallbackId) {
        window.cancelIdleCallback(idleCallbackId)
      }

      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [disabled, isLoading, user])

  return null
}

export default CrispChat
