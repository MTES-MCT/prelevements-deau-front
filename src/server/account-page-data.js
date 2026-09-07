import {redirect} from 'next/navigation'

import {getCurrentUser} from '@/server/actions/user.js'

export async function getAccountPageData({callbackUrl = '/mon-compte'} = {}) {
  const result = await getCurrentUser()
  const user = result?.data?.user ?? null
  const role = result?.data?.role ?? null

  if (result?.code === 401) {
    const parameters = new URLSearchParams({
      callbackUrl,
      error: 'session_expired'
    })
    redirect(`/login?${parameters}`)
  }

  return {
    available: Boolean(result?.success && user && role),
    isImpersonating: Boolean(result?.data?.impersonation?.active),
    role,
    user
  }
}
