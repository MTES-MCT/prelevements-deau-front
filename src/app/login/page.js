import {redirect} from 'next/navigation'

import {getLoginDestination} from '@/lib/auth-methods.js'
import {PRELEVEUR_SELECTION_PATH} from '@/lib/preleveur-profiles.js'
import {getLoginSessionState, getServerAuthSession} from '@/server/auth.js'

import LoginForm from './login-form.js'

export default async function LoginPage({searchParams}) {
  const [parameters, session] = await Promise.all([searchParams, getServerAuthSession()])
  // A cached cookie alone cannot prove that the API session is still valid.
  const state = await getLoginSessionState(session)

  if (state.status === 'authenticated') {
    redirect(state.preleveurProfiles?.selectionRequired
      ? PRELEVEUR_SELECTION_PATH
      : getLoginDestination(parameters.callbackUrl))
  }

  return (
    <LoginForm
      parameters={parameters}
      sessionUnavailable={state.status === 'unavailable'}
      clearInvalidSession={Boolean(session?.user) && state.status === 'unauthenticated'}
    />
  )
}
