'use client'

import {useState, useSyncExternalStore, useTransition} from 'react'

import {isManagedResourceType, MANAGED_RESOURCE_TYPES} from '@/lib/zone-resource-settings.js'
import {updateZoneResourceSettingsAction} from '@/server/actions/zones.js'

const subscribeToHydration = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

const ZoneResourceSettings = ({zone, settings, canEdit}) => {
  const [resourceType, setResourceType] = useState(settings.managedResourceType || '')
  const [savedType, setSavedType] = useState(settings.managedResourceType || '')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isPending, startTransition] = useTransition()
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)

  const submit = event => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    if (!canEdit || isPending) return
    if (!isManagedResourceType(resourceType)) {
      setError('Sélectionnez le type de ressource gérée.')
      return
    }

    startTransition(async () => {
      const result = await updateZoneResourceSettingsAction(zone.id, resourceType)
      if (!result.success) {
        setError(result.error || 'Impossible d’enregistrer les paramètres du SAGE.')
        return
      }
      setSavedType(result.data.data.managedResourceType)
      setResourceType(result.data.data.managedResourceType)
      setSuccess('Paramètres du SAGE enregistrés.')
    })
  }

  return (
    <section className='border border-gray-200 bg-white p-5' aria-labelledby='sage-resource-title'>
      <h2 className='fr-h4' id='sage-resource-title'>Type de ressource gérée</h2>
      {canEdit ? (
        <form onSubmit={submit}>
          <div className='fr-select-group max-w-md'>
            <label className='fr-label' htmlFor='sage-managed-resource-type'>Type de ressource gérée</label>
            <select
              required
              className='fr-select'
              id='sage-managed-resource-type'
              aria-describedby='sage-resource-hint'
              disabled={!hydrated || isPending}
              value={resourceType}
              onChange={event => {
                setResourceType(event.target.value)
                setError(null)
                setSuccess(null)
              }}
            >
              <option value='' disabled>Sélectionnez un type de ressource</option>
              {MANAGED_RESOURCE_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <p className='fr-text--sm' id='sage-resource-hint'>L’enregistrement ne modifie pas les points déjà rattachés.</p>
          <div className='flex flex-wrap items-center gap-3'>
            <button className='fr-btn' type='submit' disabled={!hydrated || isPending || resourceType === savedType}>
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {success && <p className='fr-valid-text fr-mb-0' role='status'>{success}</p>}
            {error && <p className='fr-error-text fr-mb-0' role='alert'>{error}</p>}
          </div>
        </form>
      ) : (
        <>
          <p>{MANAGED_RESOURCE_TYPES.find(option => option.value === resourceType)?.label || 'Non renseigné'}</p>
          <p className='fr-text--sm fr-mb-0'>Vous disposez d’un accès en lecture seule à ces paramètres.</p>
        </>
      )}
    </section>
  )
}

export default ZoneResourceSettings
