'use client'

import {useMemo, useState, useTransition} from 'react'

import moment from 'moment'

import SectionCard from '@/components/ui/SectionCard/index.js'
import {sendDeclarationReminderAction} from '@/server/actions/declarants.js'

const REMINDER_CONFIG = {
  expectedDeclarationEveryDays: 30,
  gracePeriodDays: 7,
  reminderCooldownDays: 14
}

function formatDate(value) {
  if (!value) {
    return 'Jamais'
  }

  return moment(value).fromNow()
}

function getReminderStatus({lastDeclarationAt, lastReminderMailSentAt}) {
  const now = moment()

  if (!lastDeclarationAt) {
    return {
      type: 'info',
      label: 'Aucune déclaration',
      description: 'Aucune déclaration connue pour ce déclarant.',
      canSend: true
    }
  }

  const lastDeclarationMoment = moment(lastDeclarationAt)
  const daysSinceLastDeclaration = now.diff(lastDeclarationMoment, 'days')

  const declarationIsLate
    = daysSinceLastDeclaration
    >= REMINDER_CONFIG.expectedDeclarationEveryDays + REMINDER_CONFIG.gracePeriodDays

  if (!declarationIsLate) {
    return {
      type: 'info',
      label: 'Pas de relance nécessaire',
      description: 'La dernière déclaration est encore suffisamment récente.',
      canSend: false
    }
  }

  if (lastReminderMailSentAt) {
    const lastReminderMoment = moment(lastReminderMailSentAt)
    const daysSinceLastReminder = now.diff(lastReminderMoment, 'days')

    if (daysSinceLastReminder < REMINDER_CONFIG.reminderCooldownDays) {
      return {
        type: 'warning',
        label: 'Relance récente',
        description: 'Un mail de relance a déjà été envoyé récemment.',
        canSend: false
      }
    }

    if (lastReminderMoment.isAfter(lastDeclarationMoment)) {
      return {
        type: 'warning',
        label: 'Relance possible',
        description: 'Aucune nouvelle déclaration n’a été reçue depuis la dernière relance.',
        canSend: true
      }
    }
  }

  return {
    type: 'warning',
    label: 'Relance à envoyer',
    description: 'Aucune déclaration récente n’a été reçue.',
    canSend: true
  }
}

const STATUS_CLASS_NAMES = {
  info: 'fr-badge fr-badge--blue-cumulus',
  warning: 'fr-badge fr-badge--orange-terre-battue',
  success: 'fr-badge fr-badge--green-emeraude'
}

const DeclarationReminderCard = ({declarant}) => {
  const [isPending, startTransition] = useTransition()
  const [isConfirming, setIsConfirming] = useState(false)
  const [result, setResult] = useState(null)

  const lastDeclarationAt = declarant?.lastDeclarationAt
  const lastReminderMailSentAt = result?.sentAt ?? declarant?.lastReminderMailSentAt

  const status = useMemo(() => {
    const computedStatus = getReminderStatus({
      lastDeclarationAt,
      lastReminderMailSentAt
    })

    if (result?.success) {
      return {
        type: 'success',
        label: 'Relance envoyée',
        description: 'Le mail de relance a bien été envoyé.',
        canSend: false
      }
    }

    return computedStatus
  }, [lastDeclarationAt, lastReminderMailSentAt, result])

  const handleSend = () => {
    if (!declarant?.userId) {
      return
    }

    startTransition(async () => {
      const response = await sendDeclarationReminderAction(declarant.userId)
      setResult(response)

      if (response?.success) {
        setIsConfirming(false)
      }
    })
  }

  const statusClassName = STATUS_CLASS_NAMES[status.type] ?? STATUS_CLASS_NAMES.info

  return (
    <SectionCard title='Relance déclaration'>
      <div className='fr-grid-row fr-grid-row--gutters fr-grid-row--middle'>
        <div className='fr-col-12 fr-col-lg-8'>
          <div className='fr-mb-2w'>
            <p className={`fr-mb-1w ${statusClassName}`}>
              {status.label}
            </p>

            <p className='fr-text--sm fr-mb-0'>
              {status.description}
            </p>
          </div>

          <div className='fr-grid-row fr-grid-row--gutters'>
            <div className='fr-col-12 fr-col-md-6'>
              <div className='fr-text--sm fr-text-mention--grey fr-mb-1v'>
                Dernière déclaration
              </div>

              <div className='fr-text--bold'>
                {formatDate(lastDeclarationAt)}
              </div>
            </div>

            <div className='fr-col-12 fr-col-md-6'>
              <div className='fr-text--sm fr-text-mention--grey fr-mb-1v'>
                Dernier mail de relance
              </div>

              <div className='fr-text--bold'>
                {formatDate(lastReminderMailSentAt)}
              </div>
            </div>
          </div>

          {result?.error && (
            <p className='fr-text--sm fr-mt-2w fr-mb-0' style={{color: 'var(--text-default-error)'}}>
              {result.error}
            </p>
          )}
        </div>

        <div className='fr-col-12 fr-col-lg-4'>
          <div className='fr-mt-2w fr-mt-lg-0'>
            {isConfirming ? (
              <div className='fr-p-2w fr-background-alt--grey fr-radius-a'>
                <p className='fr-text--sm fr-mb-2w'>
                  Confirmer l’envoi du mail de relance&nbsp;?
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
                disabled={isPending || !declarant?.userId || !status.canSend}
                onClick={() => setIsConfirming(true)}
              >
                Envoyer une relance
              </button>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

export default DeclarationReminderCard
