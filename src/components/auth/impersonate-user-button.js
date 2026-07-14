'use client'

import {useCallback, useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import Button from '@codegouvfr/react-dsfr/Button'

import {useAuth} from '@/contexts/auth-context.js'

const ImpersonateUserButton = ({
  targetUserId,
  targetLabel,
  label,
  priority = 'primary',
  size
}) => {
  const {
    user,
    startImpersonation
  } = useAuth()
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const handleClick = useCallback(async () => {
    setIsPending(true)
    setError(null)

    const result = await startImpersonation(targetUserId)

    if (!result.success) {
      setError(result.error || 'Impossible de démarrer l’impersonation.')
      setIsPending(false)
      return
    }

    router.push('/')
    router.refresh({showProgress: false})
  }, [router, startImpersonation, targetUserId])

  if (user?.role !== 'ADMIN' || user?.impersonation?.active) {
    return null
  }

  const buttonLabel = isPending ? 'Connexion en cours...' : label || `Prendre la place de ${targetLabel}`

  return (
    <div className='flex flex-col items-start sm:items-end gap-2'>
      <Button
        iconId='ri-user-shared-line'
        priority={priority}
        size={size}
        title={buttonLabel}
        disabled={isPending}
        onClick={handleClick}
      >
        {buttonLabel}
      </Button>
      {error && (
        <p className='fr-error-text fr-mb-0'>{error}</p>
      )}
    </div>
  )
}

export default ImpersonateUserButton
