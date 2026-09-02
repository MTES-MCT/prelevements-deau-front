'use client'

import {useMemo, useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Checkbox, FormControlLabel} from '@mui/material'

import {
  AgentIdentityFields,
  PermissionFields,
  ZoneAccessFields,
  todayAsInputValue
} from '@/components/agents/agent-form-fields.js'
import AgentFormLayout from '@/components/agents/agent-form-layout.js'
import {groupZoneOptions} from '@/lib/agents.js'
import {createAgentAction} from '@/server/actions/agents.js'

const FormSection = ({children, description, title}) => (
  <section className='border border-gray-200 bg-white p-5 md:p-6'>
    <h2 className='fr-h5 fr-mb-1w'>{title}</h2>
    {description && <p className='fr-text--sm text-gray-600'>{description}</p>}
    {children}
  </section>
)

const AgentCreateForm = ({permissionCatalog, zones}) => {
  const router = useRouter()
  const zoneGroups = useMemo(() => groupZoneOptions(zones), [zones])
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    jobTitle: '',
    zoneId: '',
    startDate: todayAsInputValue(),
    endDate: '',
    permissions: permissionCatalog.defaults ?? [],
    notifyAccountCreation: false,
    notifyZoneAttachment: false
  })
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = (field, value) => setForm(current => ({...current, [field]: value}))
  const disabled = isSubmitting
    || !form.email.trim()
    || !form.firstName.trim()
    || !form.lastName.trim()
    || !form.zoneId
    || !form.startDate
    || form.permissions.length === 0

  const submit = async () => {
    setError(null)

    if (form.phoneNumber && !/^\d{10}$/.test(form.phoneNumber)) {
      setError('Le numéro de téléphone doit contenir 10 chiffres.')
      return
    }

    if (form.endDate && form.startDate > form.endDate) {
      setError('La date de fin doit être postérieure à la date de début.')
      return
    }

    setIsSubmitting(true)
    const result = await createAgentAction({
      email: form.email.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phoneNumber: form.phoneNumber.trim() || null,
      jobTitle: form.jobTitle.trim() || null,
      zoneId: form.zoneId,
      startDate: form.startDate,
      endDate: form.endDate || null,
      permissions: form.permissions,
      notifyAccountCreation: form.notifyAccountCreation,
      notifyZoneAttachment: form.notifyZoneAttachment
    })

    if (!result.success || !result.data?.id) {
      setError(result.error || 'Impossible de créer cet agent.')
      setIsSubmitting(false)
      return
    }

    router.push(`/agents/${result.data.id}?created=${result.data.warnings?.length > 0 ? 'agent-warning' : 'agent'}`)
    router.refresh({showProgress: false})
  }

  return (
    <AgentFormLayout
      description='Créez le compte puis configurez son premier accès territorial.'
      title='Ajouter un agent'
    >
      <div className='flex flex-col gap-5'>
        {error && <Alert description={error} severity='error' title='Création impossible' />}
        <FormSection title='Identité de l’agent'>
          <AgentIdentityFields form={form} updateField={updateField} />
        </FormSection>
        <FormSection
          description='La création du compte et de ce premier accès sera réalisée en une seule opération.'
          title='Zone initiale'
        >
          {zones.length === 0
            ? <Alert description='Aucune zone ne peut être attribuée.' severity='warning' title='Zone indisponible' />
            : (
              <div className='fr-select-group fr-mb-0 max-w-2xl'>
                <label className='fr-label' htmlFor='agent-initial-zone'>Zone *</label>
                <select
                  required
                  className='fr-select'
                  id='agent-initial-zone'
                  value={form.zoneId}
                  onChange={event => updateField('zoneId', event.target.value)}
                >
                  <option value=''>Sélectionner une zone</option>
                  {zoneGroups.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
        </FormSection>
        <FormSection title='Période d’accès'>
          <ZoneAccessFields form={form} updateField={updateField} />
        </FormSection>
        <FormSection
          description='Sélectionnez au moins un droit. Les dépendances nécessaires sont ajoutées automatiquement.'
          title='Droits sur la zone'
        >
          <PermissionFields
            catalog={permissionCatalog}
            permissions={form.permissions}
            setPermissions={permissions => updateField('permissions', permissions)}
          />
        </FormSection>
        <FormSection title='Emails'>
          <div className='flex flex-col gap-1'>
            <FormControlLabel
              control={<Checkbox checked={form.notifyAccountCreation} onChange={event => updateField('notifyAccountCreation', event.target.checked)} />}
              label='Envoyer l’email de création du compte'
            />
            <FormControlLabel
              control={<Checkbox checked={form.notifyZoneAttachment} onChange={event => updateField('notifyZoneAttachment', event.target.checked)} />}
              label='Envoyer l’email de rattachement à la zone'
            />
          </div>
        </FormSection>
        <div className='flex flex-wrap justify-end gap-2'>
          <Button priority='secondary' linkProps={{href: '/agents'}}>Annuler</Button>
          <Button disabled={disabled} onClick={submit}>
            {isSubmitting ? 'Création…' : 'Créer l’agent'}
          </Button>
        </div>
      </div>
    </AgentFormLayout>
  )
}

export default AgentCreateForm
