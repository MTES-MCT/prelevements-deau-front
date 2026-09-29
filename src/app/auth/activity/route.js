import {authenticatedFetch} from '@/server/api-wrapper.js'
import {createUserActivityHandler} from '@/server/user-activity.js'

// /auth/ routes reach their own authentication without the page guard redirect.
export const POST = createUserActivityHandler({
  requestActivity: options => authenticatedFetch('api/users/me/activity', options)
})
