'use client'

import {useMemo, useState, useTransition} from 'react'

import moment from 'moment'
import Button from '@codegouvfr/react-dsfr/Button'

import DeclarantManagementCard from '@/components/declarants/declarant-management-card.js'
import {sendDeclarantAccountCreationNotificationAction} from '@/server/actions/declarants.js'

function getDeclarantId(declarant) {
  return declarant?.userId || declarant?.id
}

function getLastSentAt(declarant, result) {
  return result?.data?.user?.accountCreationMailSentAt
    ?? result?.data?.accountCreationMailSentAt
    ?? declarant?.user?.accountCreationMailSentAt
    ?? declarant?.accountCreationMailSentAt
}

function formatDate(value) {
  if (!value) {
    return 'Jamais'
  }

  return moment(value).fromNow()
}

const AccountCreationNotificationCard = ({declarant}) => {
  const [isPending, startTransition] = useTransition()
  const [isConfirming, setIsConfirming] = useState(false)
  const [result, setResult] = useState(null)

  const declarantId = getDeclarantId(declarant)
  const lastSentAt = getLastSentAt(declarant, result)

  const status = useMemo(() => {
    if (result?.success) {
      return {
        className: 'fr-badge fr-badge--green-emeraude',
        label: 'Notification envoyée'
      }
    }

    if (lastSentAt) {
      return {
        className: 'fr-badge fr-badge--blue-cumulus',
        label: 'Déjà notifié'
      }
    }

    return {
      className: 'fr-badge fr-badge--orange-terre-battue',
      label: 'Non notifié'
    }
  }, [lastSentAt, result])

  const handleSend = () => {
    if (!declarantId) {
      return
    }

    startTransition(async () => {
      const response = await sendDeclarantAccountCreationNotificationAction(declarantId)
      setResult(response)

      if (response?.success) {
        setIsConfirming(false)
      }
    })
  }

  return (
    <DeclarantManagementCard id='declarant-notification' title='Notification du compte'
      description='Envoyer au déclarant les informations pour accéder à son compte.'
    >
      <div className='flex flex-col gap-4'>
        <div>
          <p className={`fr-mb-1w fr-badge--sm ${status.className}`} role='status'>{status.label}</p>
          <p className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>
            Dernier envoi : {formatDate(lastSentAt)}
          </p>

          {result?.error && (
            <p role='alert' className='fr-text--sm fr-mt-2w fr-mb-0' style={{color: 'var(--text-default-error)'}}>
              {result.error}
            </p>
          )}
        </div>

        <div>
          {isConfirming ? (
            <div className='p-4 bg-[var(--background-alt-grey)]'>
              <p className='fr-text--sm fr-mb-2w'>
                Confirmer l’envoi du mail de création de compte&nbsp;?
              </p>

              <div className='flex flex-wrap gap-2'>
                <Button
                  size='small'
                  disabled={isPending}
                  onClick={handleSend}
                >
                  {isPending ? 'Envoi…' : 'Confirmer'}
                </Button>

                <Button
                  size='small'
                  priority='secondary'
                  disabled={isPending}
                  onClick={() => setIsConfirming(false)}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button
              priority='secondary'
              disabled={isPending || !declarantId}
              onClick={() => setIsConfirming(true)}
            >
              Envoyer le mail de compte
            </Button>
          )}
        </div>
      </div>
    </DeclarantManagementCard>
  )
}

export default AccountCreationNotificationCard
