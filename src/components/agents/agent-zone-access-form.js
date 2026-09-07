'use client'

import {useMemo, useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Checkbox, FormControlLabel} from '@mui/material'

import {
  PermissionFields,
  ZoneAccessFields,
  todayAsInputValue
} from '@/components/agents/agent-form-fields.js'
import AgentFormLayout from '@/components/agents/agent-form-layout.js'
import {
  getAgentCurrentAndFutureZoneIds,
  getAgentName,
  groupZoneOptions
} from '@/lib/agents.js'
import {
  addZoneInstructorAction,
  sendZoneInstructorAttachmentNotificationAction
} from '@/server/actions/zones.js'

const AgentZoneAccessForm = ({agent, permissionCatalog, zones}) => {
  const router = useRouter()
  const availableZones = useMemo(() => {
    const assigned = getAgentCurrentAndFutureZoneIds(agent)
    return zones.filter(zone => !assigned.has(zone.id))
  }, [agent, zones])
  const zoneGroups = useMemo(() => groupZoneOptions(availableZones), [availableZones])
  const [form, setForm] = useState({
    zoneId: '',
    startDate: todayAsInputValue(),
    endDate: '',
    permissions: permissionCatalog.defaults ?? [],
    notifyZoneAttachment: false
  })
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const updateField = (field, value) => setForm(current => ({...current, [field]: value}))

  const submit = async () => {
    setError(null)
    if (form.endDate && form.startDate > form.endDate) {
      setError('La date de fin doit être postérieure à la date de début.')
      return
    }

    setIsSubmitting(true)
    const result = await addZoneInstructorAction(form.zoneId, {
      instructorUserId: agent.id,
      startDate: form.startDate,
      endDate: form.endDate || null,
      permissions: form.permissions,
      notifyAccountCreation: false,
      notifyZoneAttachment: false
    })

    if (!result.success) {
      setError(result.error || 'Impossible d’ajouter cet accès.')
      setIsSubmitting(false)
      return
    }

    let feedback = 'access'

    if (form.notifyZoneAttachment) {
      try {
        const notificationResult = await sendZoneInstructorAttachmentNotificationAction(
          form.zoneId,
          agent
        )

        if (!notificationResult.success) {
          feedback = 'access-warning'
        }
      } catch {
        feedback = 'access-warning'
      }
    }

    router.push(`/agents/${agent.id}?updated=${feedback}`)
    router.refresh({showProgress: false})
  }

  return (
    <AgentFormLayout
      agentId={agent.id}
      description={`Configurez un nouvel accès territorial pour ${getAgentName(agent)}.`}
      title='Ajouter une zone'
    >
      <div className='flex flex-col gap-5'>
        {error && <Alert description={error} severity='error' title='Ajout impossible' />}
        <section className='border border-gray-200 bg-white p-5 md:p-6'>
          <h2 className='fr-h5 fr-mb-2w'>Zone</h2>
          {availableZones.length === 0
            ? <Alert description='Toutes les zones sont déjà rattachées à cet agent.' severity='info' title='Aucune zone disponible' />
            : (
              <div className='fr-select-group fr-mb-0 max-w-2xl'>
                <label className='fr-label' htmlFor='agent-new-zone'>Zone *</label>
                <select className='fr-select' id='agent-new-zone' value={form.zoneId} onChange={event => updateField('zoneId', event.target.value)}>
                  <option value=''>Sélectionner une zone</option>
                  {zoneGroups.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
        </section>
        <section className='border border-gray-200 bg-white p-5 md:p-6'>
          <h2 className='fr-h5 fr-mb-2w'>Période d’accès</h2>
          <ZoneAccessFields form={form} updateField={updateField} />
        </section>
        <section className='border border-gray-200 bg-white p-5 md:p-6'>
          <h2 className='fr-h5 fr-mb-1w'>Droits sur la zone</h2>
          <p className='fr-text--sm text-gray-600'>Sélectionnez au moins un droit.</p>
          <PermissionFields catalog={permissionCatalog} permissions={form.permissions} setPermissions={permissions => updateField('permissions', permissions)} />
        </section>
        <section className='border border-gray-200 bg-white p-5 md:p-6'>
          <h2 className='fr-h5 fr-mb-1w'>Email</h2>
          <FormControlLabel
            control={<Checkbox checked={form.notifyZoneAttachment} onChange={event => updateField('notifyZoneAttachment', event.target.checked)} />}
            label='Envoyer l’email de rattachement à la zone'
          />
        </section>
        <div className='flex flex-wrap justify-end gap-2'>
          <Button priority='secondary' linkProps={{href: `/agents/${agent.id}`}}>Annuler</Button>
          <Button
            disabled={isSubmitting || !form.zoneId || !form.startDate || form.permissions.length === 0}
            onClick={submit}
          >
            {isSubmitting ? 'Ajout…' : 'Ajouter la zone'}
          </Button>
        </div>
      </div>
    </AgentFormLayout>
  )
}

export default AgentZoneAccessForm
