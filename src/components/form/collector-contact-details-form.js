'use client'

import {useRef, useState, useSyncExternalStore} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'

import {updateCollectorContactDetailsAction} from '@/server/actions/collector-points.js'

const fields = [
  ['phoneNumber', 'Téléphone'], ['addressLine1', 'Adresse'], ['addressLine2', 'Complément d’adresse'],
  ['poBox', 'Boîte postale'], ['postalCode', 'Code postal'], ['city', 'Commune']
]
const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export default function CollectorContactDetailsForm({form}) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
  const [details, setDetails] = useState(form.details)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [mustReload, setMustReload] = useState(false)
  const submitting = useRef(false)

  async function save(event) {
    event.preventDefault()
    if (submitting.current || mustReload) return
    submitting.current = true
    setPending(true)
    setError(null)
    const changes = Object.fromEntries(fields.map(([key]) => [key, details[key]?.trim() || null]))
    changes.email = details.email?.trim() || null
    try {
      const result = await updateCollectorContactDetailsAction(form.preleveurId, {version: form.version, details: changes})
      if (result.success) setSaved(true)
      else {
        setError(result)
        setMustReload(result.data?.code === 'COLLECTOR_RESOURCE_CHANGED' || !result.code || result.code >= 500)
      }
    } catch {
      setError({error: 'La réponse n’a pas pu être confirmée. Rechargez la fiche pour vérifier les informations.'})
      setMustReload(true)
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  if (saved) return <div className='mb-8'>
    <Alert severity='success' title='Les informations du préleveur ont été mises à jour.' />
    <Button className='mt-5' linkProps={{href: `/preleveurs/${form.preleveurId}`}}>Voir le préleveur</Button>
  </div>

  return <form onSubmit={save} className='mb-8'>
    <h1 className='fr-h3'>Modifier le préleveur</h1>
    <fieldset className='m-0 min-w-0 border-0 p-0' disabled={!hydrated || pending || !form.capabilities.canEdit}>
      <legend className='sr-only'>Informations du préleveur</legend>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Input label='Adresse email' nativeInputProps={{type: 'email', autoComplete: 'email', value: details.email ?? '',
          onChange: event => setDetails(previous => ({...previous, email: event.target.value}))}} />
        {fields.map(([key, label]) => <Input key={key} label={label} nativeInputProps={{
          type: key === 'phoneNumber' ? 'tel' : 'text', value: details[key] ?? '',
          ...(key === 'phoneNumber' ? {maxLength: 10, pattern: '[0-9]{10}'} : {}),
          onChange: event => setDetails(previous => ({...previous, [key]: event.target.value}))
        }} />)}
      </div>
    </fieldset>
    {error && <Alert className='mt-4' severity='error' title={error.error || 'Les informations n’ont pas pu être enregistrées.'}
      description={error.validationErrors?.length ? <ul>{error.validationErrors.map((item, index) => <li key={index}>{item.message}</li>)}</ul> : undefined} />}
    <div className='flex flex-wrap justify-end gap-3 mt-5'>
      <Button priority='secondary' linkProps={{href: `/preleveurs/${form.preleveurId}`}}>Annuler</Button>
      {mustReload ? <Button type='button' onClick={() => window.location.reload()}>Recharger la fiche</Button>
        : <Button type='submit' disabled={!hydrated || pending || !form.capabilities.canEdit}>{pending ? 'Enregistrement…' : 'Enregistrer les modifications'}</Button>}
    </div>
  </form>
}
