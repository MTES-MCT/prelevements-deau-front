'use client'

import {useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Alert, Typography} from '@mui/material'

import {CopyEmailButton} from '@/components/ui/CopyableEmail/index.js'
import {updateDeclarantContactEmailsAction} from '@/server/actions/declarants.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

const PreleveurContactEmailsForm = ({declarantId, initialContactEmails = []}) => {
  const [contacts, setContacts] = useState(initialContactEmails)
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const normalizedEmails = useMemo(
    () => new Set(contacts.map(contact => normalizeEmail(contact.email))),
    [contacts]
  )

  const saveContacts = async nextContacts => {
    setError(null)
    setMessage(null)
    setIsSaving(true)

    try {
      const response = await updateDeclarantContactEmailsAction(
        declarantId,
        nextContacts.map(({email: contactEmail, isPrimary}) => ({
          email: contactEmail,
          isPrimary: Boolean(isPrimary)
        }))
      )

      if (!response.success) {
        setError(response.error || 'La mise à jour des contacts a échoué.')
        return false
      }

      setContacts(response.data?.contactEmails ?? [])
      setMessage('Adresses de contact mises à jour.')
      return true
    } catch {
      setError('La mise à jour des contacts a échoué.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdd = async () => {
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Veuillez saisir une adresse e-mail valide.')
      return
    }

    if (normalizedEmails.has(normalizedEmail)) {
      setError('Cette adresse de contact est déjà présente.')
      return
    }

    if (contacts.length >= 20) {
      setError('Un déclarant ne peut pas avoir plus de 20 adresses de contact.')
      return
    }

    const nextContacts = [
      ...contacts,
      {email: normalizedEmail, isPrimary: contacts.length === 0}
    ]

    if (await saveContacts(nextContacts)) {
      setEmail('')
    }
  }

  const handlePrimaryChange = contactId => {
    saveContacts(contacts.map(contact => ({
      ...contact,
      isPrimary: contact.id === contactId
    })))
  }

  const handleDelete = contactId => {
    const wasPrimary = contacts.some(contact => contact.id === contactId && contact.isPrimary)
    const nextContacts = contacts.filter(contact => contact.id !== contactId)

    if (wasPrimary && nextContacts.length > 0) {
      nextContacts[0] = {...nextContacts[0], isPrimary: true}
    }

    saveContacts(nextContacts)
  }

  return (
    <div className='flex flex-col gap-4'>
      <Typography variant='body2' color='text.secondary'>
        Ces adresses servent aux échanges métier et aux relances. Elles ne permettent pas de se connecter au compte.
      </Typography>

      {contacts.length === 0 ? (
        <Typography variant='body2'>Aucune adresse de contact renseignée.</Typography>
      ) : (
        <ul className='flex flex-col gap-2'>
          {contacts.map(contact => (
            <li key={contact.id || contact.email} className='flex flex-wrap items-center gap-2 rounded border border-gray-200 p-2'>
              <label className='flex min-w-0 flex-1 items-center gap-2'>
                <input
                  checked={Boolean(contact.isPrimary)}
                  disabled={isSaving}
                  name={`primary-contact-${declarantId}`}
                  type='radio'
                  onChange={() => handlePrimaryChange(contact.id)}
                />
                <span className='truncate'>{contact.email}</span>
                {contact.isPrimary && <span className='text-xs text-gray-600'>(principal)</span>}
              </label>
              <CopyEmailButton revealOnHover email={contact.email} />
              <Button
                iconId='fr-icon-delete-line'
                priority='tertiary no outline'
                size='small'
                title={`Supprimer ${contact.email}`}
                disabled={isSaving}
                onClick={() => handleDelete(contact.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className='flex flex-col gap-3 md:flex-row md:items-end'>
        <div className='flex-1'>
          <Input
            label='Nouvelle adresse de contact'
            hintText='Une même adresse peut être utilisée par plusieurs déclarants.'
            nativeInputProps={{
              type: 'email',
              value: email,
              onChange: event => setEmail(event.target.value),
              onKeyDown(event) {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleAdd()
                }
              }
            }}
          />
        </div>
        <div className='md:pb-6'>
          <Button disabled={isSaving} priority='secondary' onClick={handleAdd}>
            Ajouter ce contact
          </Button>
        </div>
      </div>

      {message && <Alert severity='success' onClose={() => setMessage(null)}>{message}</Alert>}
      {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}
    </div>
  )
}

export default PreleveurContactEmailsForm
