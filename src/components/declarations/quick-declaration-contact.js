'use client'

import {useId, useMemo, useState} from 'react'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {createModal} from '@codegouvfr/react-dsfr/Modal'
import {contactQuickDeclarationAction} from '@/server/actions/declarations.js'

function formatDate(day) {
  return day?.slice(0, 10).split('-').reverse().join('/') ?? ''
}

const QuickDeclarationContact = ({payload, declarationId, measure, warnings}) => {
  const id = useId()
  const modal = useMemo(() => createModal({id: `quick-contact-${id}`, isOpenedByDefault: false}), [id])
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [warning] = warnings
  const exploitationId = warning.exploitationId ?? measure?.exploitationId
  const entryId = declarationId ? warning.entryId ?? measure?.id : undefined
  if (!exploitationId && !entryId) return null

  const open = () => {
    const date = formatDate(warning.readingDate ?? payload.readingDate)
    const value = warning.value ?? measure?.after?.value
    const details = [
      warning.pointName && `Point : ${warning.pointName}`,
      warning.compteurName && `Compteur : ${warning.compteurName}`,
      value != null && `Index du ${date} : ${value} m³`,
      ...warnings.map(item => item.message)
    ].filter(Boolean)
    setMessage(details.join('\n') + '\n\n')
    setFeedback(null)
    modal.open()
  }

  const send = async () => {
    setPending(true)
    try {
      const result = await contactQuickDeclarationAction({
        declarationId: declarationId || undefined,
        declarantUserId: payload.declarantUserId,
        pointPrelevementId: warning.pointPrelevementId,
        exploitationId: exploitationId ?? undefined,
        entryId,
        message
      })
      setFeedback(result.success ? {sent: true} : {error: result.error})
    } catch {
      setFeedback({error: 'Le message n’a pas pu être envoyé. Vous pouvez réessayer.'})
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button priority='tertiary no outline' size='small' type='button' nativeButtonProps={{'aria-controls': modal.id}} onClick={open}>
        Contacter l’équipe PE
      </Button>
      <modal.Component title='Contacter l’équipe PE'>
        {feedback?.sent ? <p role='status'>Votre message a été envoyé à l’équipe PE.</p> : (
          <>
            <label className='fr-label' htmlFor={id}>Votre message</label>
            <textarea className='fr-input fr-mb-2w' id={id} rows={7} value={message} maxLength={5000} onChange={event => setMessage(event.target.value)} />
            {feedback?.error && <p className='fr-error-text' role='alert'>{feedback.error}</p>}
            <Button type='button' disabled={pending || !message.trim()} onClick={send}>
              {pending ? 'Envoi en cours…' : 'Envoyer le message'}
            </Button>
          </>
        )}
      </modal.Component>
    </>
  )
}

export default QuickDeclarationContact
