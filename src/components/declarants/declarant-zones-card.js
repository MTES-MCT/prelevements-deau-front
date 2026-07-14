'use client'

import {useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Alert} from '@mui/material'

import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {updateDeclarantZonesAction} from '@/server/actions/declarants.js'

const ZONE_TYPE_LABELS = {
  REGION: 'Régions',
  DEPARTEMENT: 'Départements',
  SAGE: 'SAGE'
}

const DeclarantZonesCard = ({availableZones, declarantId, initialItems}) => {
  const initialZoneIds = useMemo(() => initialItems.map(item => item.zoneId), [initialItems])
  const [savedZoneIds, setSavedZoneIds] = useState(initialZoneIds)
  const [zoneIds, setZoneIds] = useState(initialZoneIds)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const manageableZoneIds = useMemo(
    () => new Set(availableZones.map(zone => zone.id)),
    [availableZones]
  )
  const options = useMemo(() => {
    const zonesById = new Map(availableZones.map(zone => [zone.id, zone]))
    for (const item of initialItems) {
      zonesById.set(item.zoneId, item.zone)
    }

    const groups = new Map()
    for (const zone of zonesById.values()) {
      const type = zone.type || 'AUTRE'
      if (!groups.has(type)) {
        groups.set(type, [])
      }

      const canManage = manageableZoneIds.has(zone.id)
      groups.get(type).push({
        value: zone.id,
        label: zone.name,
        content: `${zone.name}${zone.code ? ` - ${zone.code}` : ''}`,
        disabled: !canManage,
        disabledReason: 'Vous ne pouvez pas modifier le rattachement à cette zone.'
      })
    }

    return [...groups]
      .sort(([left], [right]) => left.localeCompare(right, 'fr'))
      .map(([type, groupOptions]) => ({
        label: ZONE_TYPE_LABELS[type] || type,
        options: groupOptions.sort((left, right) => left.label.localeCompare(right.label, 'fr'))
      }))
  }, [availableZones, initialItems, manageableZoneIds])

  const hasChanges = zoneIds.length !== savedZoneIds.length
    || zoneIds.some(zoneId => !savedZoneIds.includes(zoneId))

  const save = async () => {
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    const result = await updateDeclarantZonesAction(declarantId, zoneIds)
    if (result.success) {
      setSavedZoneIds(zoneIds)
      setSuccess('Rattachements enregistrés.')
    } else {
      setError(result.error || 'Impossible d’enregistrer les zones du déclarant.')
    }

    setIsSubmitting(false)
  }

  return (
    <SectionCard title='Zones de rattachement' icon='ri-map-pin-2-line' editorOnly={false}>
      <div className='flex flex-col gap-4'>
        <p className='fr-text--sm fr-mb-0'>
          Ces zones déterminent où le déclarant est visible et quels agents peuvent le gérer.
        </p>

        <GroupedMultiselect
          searchable
          id='declarant-management-zone-ids'
          label='Zones *'
          options={options}
          placeholder='Sélectionner une ou plusieurs zones'
          value={zoneIds}
          onChange={setZoneIds}
        />

        {error && <Alert severity='error'>{error}</Alert>}
        {success && <Alert severity='success'>{success}</Alert>}

        <div className='flex justify-end'>
          <Button disabled={isSubmitting || !hasChanges || zoneIds.length === 0} onClick={save}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer les zones'}
          </Button>
        </div>
      </div>
    </SectionCard>
  )
}

export default DeclarantZonesCard
