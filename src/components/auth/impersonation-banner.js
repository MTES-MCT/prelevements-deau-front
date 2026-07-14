'use client'

import {useCallback, useMemo, useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import Button from '@codegouvfr/react-dsfr/Button'

import {useAuth} from '@/contexts/auth-context.js'

function getUserLabel(user) {
  if (!user) {
    return 'utilisateur inconnu'
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')

  return fullName || user.email || 'utilisateur inconnu'
}

const ImpersonationBanner = () => {
  const {
    user,
    stopImpersonation
  } = useAuth()
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const impersonation = user?.impersonation
  const targetLabel = useMemo(() => getUserLabel(impersonation?.target || user), [impersonation, user])
  const actorLabel = useMemo(() => getUserLabel(impersonation?.actor), [impersonation])

  const handleStop = useCallback(async () => {
    setIsPending(true)
    setError(null)

    const result = await stopImpersonation()

    if (!result.success) {
      setError(result.error || 'Impossible de reprendre le rôle initial.')
      setIsPending(false)
      return
    }

    router.push('/')
    router.refresh({showProgress: false})
  }, [router, stopImpersonation])

  if (!impersonation?.active) {
    return null
  }

  return (
    <div
      role='status'
      className='fr-py-3w fr-px-4w'
      style={{
        backgroundColor: 'var(--background-action-high-warning)',
        color: 'var(--text-inverted-grey)',
        borderBottom: '4px solid var(--border-plain-warning)'
      }}
    >
      <div className='fr-container flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div>
          <p className='fr-text--lg fr-text--bold fr-mb-1w'>
            Vous prenez la place de {targetLabel}.
          </p>
          <p className='fr-mb-0'>
            Votre compte initial est {actorLabel}. Reprenez votre rôle initial dès que l’intervention est terminée.
          </p>
          {error && (
            <p className='fr-error-text fr-mb-0 fr-mt-1w'>{error}</p>
          )}
        </div>
        <Button
          priority='primary'
          iconId='ri-logout-box-r-line'
          disabled={isPending}
          style={{
            backgroundColor: 'var(--background-default-grey)',
            color: 'var(--text-title-grey)',
            boxShadow: 'inset 0 0 0 1px var(--border-default-grey)'
          }}
          onClick={handleStop}
        >
          {isPending ? 'Retour en cours...' : 'Reprendre mon rôle initial'}
        </Button>
      </div>
    </div>
  )
}

export default ImpersonationBanner
