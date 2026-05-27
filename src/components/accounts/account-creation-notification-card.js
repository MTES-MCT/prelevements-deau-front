'use client'

import {useMemo, useState, useTransition} from 'react'

import moment from 'moment'

import SectionCard from '@/components/ui/SectionCard/index.js'
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
        label: 'Notification envoyée',
        description: 'Le mail de création de compte a bien été envoyé.'
      }
    }

    if (lastSentAt) {
      return {
        className: 'fr-badge fr-badge--blue-cumulus',
        label: 'Déjà notifié',
        description: 'Un mail de création de compte a déjà été envoyé.'
      }
    }

    return {
      className: 'fr-badge fr-badge--orange-terre-battue',
      label: 'Non notifié',
      description: 'Aucun mail de création de compte n’a encore été envoyé.'
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
    <SectionCard title='Notification du compte'>
      <div className='fr-grid-row fr-grid-row--gutters fr-grid-row--middle'>
        <div className='fr-col-12 fr-col-lg-8'>
          <p className={`fr-mb-1w ${status.className}`}>{status.label}</p>
          <p className='fr-text--sm fr-mb-2w'>{status.description}</p>

          <div className='fr-text--sm fr-text-mention--grey fr-mb-1v'>
            Dernier mail de création de compte
          </div>
          <div className='fr-text--bold'>{formatDate(lastSentAt)}</div>

          {result?.error && (
            <p className='fr-text--sm fr-mt-2w fr-mb-0' style={{color: 'var(--text-default-error)'}}>
              {result.error}
            </p>
          )}
        </div>

        <div className='fr-col-12 fr-col-lg-4'>
          {isConfirming ? (
            <div className='fr-p-2w fr-background-alt--grey fr-radius-a'>
              <p className='fr-text--sm fr-mb-2w'>
                Confirmer l’envoi du mail de création de compte&nbsp;?
              </p>

              <div className='fr-btns-group fr-btns-group--inline fr-btns-group--sm fr-mb-0'>
                <button
                  type='button'
                  className='fr-btn'
                  disabled={isPending}
                  onClick={handleSend}
                >
                  {isPending ? 'Envoi…' : 'Confirmer'}
                </button>

                <button
                  type='button'
                  className='fr-btn fr-btn--secondary'
                  disabled={isPending}
                  onClick={() => setIsConfirming(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              type='button'
              className='fr-btn'
              disabled={isPending || !declarantId}
              onClick={() => setIsConfirming(true)}
            >
              Envoyer le mail de compte
            </button>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

export default AccountCreationNotificationCard
