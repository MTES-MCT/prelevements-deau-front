'use client'

import {useMemo, useState} from 'react'
import Button from '@codegouvfr/react-dsfr/Button'
import {Alert, Checkbox, FormControlLabel} from '@mui/material'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {collectorManagementHasChanges, collectorManagementZoneOptions} from '@/lib/collector-point-management.js'
import {updateCollectorPointManagementAction} from '@/server/actions/collector-point-management.js'

const CollectorPointManagementCard = ({collecteurId, initialManagement, availableZones = [], loadError}) => {
  const [saved, setSaved] = useState(initialManagement)
  const [enabled, setEnabled] = useState(initialManagement?.enabled ?? false)
  const [zoneIds, setZoneIds] = useState(initialManagement?.zoneIds ?? [])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const options = useMemo(() => collectorManagementZoneOptions(availableZones, initialManagement?.zones), [availableZones, initialManagement])
  const hasChanges = saved && collectorManagementHasChanges({enabled, zoneIds}, saved)
  const missingZones = enabled && zoneIds.length === 0

  const save = async event => {
    event.preventDefault()
    if (pending || !hasChanges || missingZones) return
    setPending(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await updateCollectorPointManagementAction(collecteurId, {enabled, zoneIds})
      if (!result.success) {
        setError(result.error || 'Impossible d’enregistrer cette habilitation.')
        return
      }
      setSaved(result.data)
      setEnabled(result.data.enabled)
      setZoneIds(result.data.zoneIds)
      setSuccess(result.data.enabled ? 'Gestion des points autorisée.' : 'Gestion des points désactivée. Les autres droits sont conservés.')
    } catch {
      setError('L’enregistrement a échoué. Réessayez.')
    } finally {
      setPending(false)
    }
  }

  return (
    <SectionCard title='Gestion des points' icon='ri-map-pin-add-line' editorOnly={false}>
      {loadError || !initialManagement ? <Alert severity='error'>Impossible de charger cette habilitation. Rechargez la page.</Alert> : (
        <form className='flex flex-col gap-4' onSubmit={save}>
          <div>
            <FormControlLabel
              control={<Checkbox checked={enabled} disabled={pending} onChange={event => {
                setEnabled(event.target.checked)
                setSuccess(null)
              }} />}
              label='Autoriser la gestion des points'
            />
            <p className='fr-text--sm fr-mb-0'>
              Le collecteur peut modifier les points qu’il suit et en créer pour ses préleveurs.
              Les points partagés sont modifiés pour toutes leurs exploitations.
            </p>
          </div>
          <GroupedMultiselect
            searchable
            showCheckboxes
            disabled={pending || !enabled}
            id={`collector-management-zones-${collecteurId}`}
            label='Zones autorisées pour créer ou déplacer un point'
            hint='Ces zones ne donnent pas accès aux autres points ou préleveurs.'
            options={options}
            value={zoneIds}
            placeholder='Sélectionner une ou plusieurs zones'
            state={missingZones ? 'error' : 'default'}
            stateRelatedMessage={missingZones ? 'Sélectionnez au moins une zone.' : null}
            onChange={next => {
              setZoneIds(next)
              setSuccess(null)
            }}
          />
          {error && <Alert severity='error'>{error}</Alert>}
          {success && <Alert severity='success'>{success}</Alert>}
          <div className='flex justify-end'>
            <Button type='submit' disabled={pending || !hasChanges || missingZones}>
              {pending ? 'Enregistrement…' : 'Enregistrer l’habilitation'}
            </Button>
          </div>
        </form>
      )}
    </SectionCard>
  )
}

export default CollectorPointManagementCard
