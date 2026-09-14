'use client'

import {useEffect} from 'react'

import {usePathname} from 'next/navigation'

import {useAuth} from '@/contexts/auth-context.js'
import {
  createUserActivityTracker,
  getActivityActorId,
  observeUserActivity,
  sendUserActivity,
  shouldTrackUserActivity
} from '@/lib/user-activity.js'

const tracker = createUserActivityTracker({sendActivity: sendUserActivity})

const UserActivityTracker = () => {
  const {user, isAuthenticated} = useAuth()
  const pathname = usePathname()
  const actorId = isAuthenticated ? getActivityActorId(user) : null

  useEffect(() => {
    if (!shouldTrackUserActivity({actorId, pathname})) {
      return
    }

    return observeUserActivity({
      tracker,
      actorId,
      documentTarget: document,
      windowTarget: window
    })
  }, [actorId, pathname])

  return null
}

export default UserActivityTracker
