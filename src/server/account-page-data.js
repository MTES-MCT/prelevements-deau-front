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

  if (result?.data?.preleveurProfiles?.selectionRequired) redirect('/choisir-preleveur')
  const requiresAccountSelection = result?.data?.preleveurProfiles?.canManageAccount === false

  return {
    available: Boolean(result?.success && user && role && !requiresAccountSelection),
    requiresAccountSelection,
    canSwitchPreleveur: result?.data?.preleveurProfiles?.canSwitch === true,
    isImpersonating: Boolean(result?.data?.impersonation?.active),
    role,
    user
  }
}
