'use client'

import {useState, useTransition} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import moment from 'moment'
import 'moment/locale/fr'

import {
  sendZoneInstructorAccountCreationNotificationAction,
  sendZoneInstructorAttachmentNotificationAction
} from '@/server/actions/zones.js'

moment.locale('fr')

function formatDate(value) {
  if (!value) {
    return 'Jamais'
  }

  return moment(value).fromNow()
}

function resolveInstructor(response, fallback) {
  return response?.success && response?.data ? response.data : fallback
}

const ZoneInstructorNotificationActions = ({zone, instructor}) => {
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState(null)
  const [result, setResult] = useState(null)

  const currentInstructor = resolveInstructor(result, instructor)

  const sendAccountNotification = () => {
    setPendingAction('account')
    startTransition(async () => {
      const response = await sendZoneInstructorAccountCreationNotificationAction(zone.id, currentInstructor)
      setResult(response)
      setPendingAction(null)
    })
  }

  const sendAttachmentNotification = () => {
    setPendingAction('attachment')
    startTransition(async () => {
      const response = await sendZoneInstructorAttachmentNotificationAction(zone.id, currentInstructor)
      setResult(response)
      setPendingAction(null)
    })
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='fr-text--xs fr-mb-0'>
        <div>Compte&nbsp;: {formatDate(currentInstructor.accountCreationMailSentAt)}</div>
        <div>Rattachement zone&nbsp;: {formatDate(currentInstructor.zoneAttachmentMailSentAt)}</div>
      </div>

      {result?.error && (
        <p className='fr-text--xs fr-mb-0' style={{color: 'var(--text-default-error)'}}>
          {result.error}
        </p>
      )}

      {result?.success && (
        <p className='fr-text--xs fr-mb-0' style={{color: 'var(--text-default-success)'}}>
          Email envoyé.
        </p>
      )}

      <div className='flex flex-wrap gap-2'>
        <Button
          priority='tertiary no outline'
          size='small'
          disabled={isPending}
          onClick={sendAccountNotification}
        >
          {pendingAction === 'account' ? 'Envoi…' : 'Notifier le compte'}
        </Button>

        <Button
          priority='tertiary no outline'
          size='small'
          disabled={isPending}
          onClick={sendAttachmentNotification}
        >
          {pendingAction === 'attachment' ? 'Envoi…' : 'Notifier la zone'}
        </Button>
      </div>
    </div>
  )
}

export default ZoneInstructorNotificationActions
