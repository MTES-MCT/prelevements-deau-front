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
    return 'jamais envoyé'
  }

  return moment(value).fromNow()
}

function resolveInstructor(response, fallback) {
  return response?.success && response?.data ? response.data : fallback
}

const ACTIONS = {
  account: {
    buttonLabel: 'Envoyer l’email de compte',
    doneLabel: 'Email de compte',
    pendingAction: 'account',
    pendingLabel: 'Envoi…',
    sentAtField: 'accountCreationMailSentAt',
    sendAction: sendZoneInstructorAccountCreationNotificationAction
  },
  attachment: {
    buttonLabel: 'Envoyer l’email de rattachement',
    doneLabel: 'Email de rattachement',
    pendingAction: 'attachment',
    pendingLabel: 'Envoi…',
    sentAtField: 'zoneAttachmentMailSentAt',
    sendAction: sendZoneInstructorAttachmentNotificationAction
  }
}

const ZoneInstructorNotificationActions = ({zone, instructor, type}) => {
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState(null)
  const [result, setResult] = useState(null)

  const action = ACTIONS[type]
  const currentInstructor = resolveInstructor(result, instructor)

  const sendNotification = () => {
    setPendingAction(action.pendingAction)
    startTransition(async () => {
      const response = await action.sendAction(zone.id, currentInstructor)
      setResult(response)
      setPendingAction(null)
    })
  }

  return (
    <div className='flex flex-col gap-1'>
      <p className='fr-text--xs fr-mb-0'>
        {action.doneLabel}&nbsp;: {formatDate(currentInstructor[action.sentAtField])}
      </p>

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

      <Button
        priority='tertiary no outline'
        size='small'
        disabled={isPending}
        onClick={sendNotification}
      >
        {pendingAction === action.pendingAction ? action.pendingLabel : action.buttonLabel}
      </Button>
    </div>
  )
}

export default ZoneInstructorNotificationActions
