'use client'

import {useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'

import {
  PermissionFields,
  ZoneAccessFields
} from '@/components/agents/agent-form-fields.js'
import AgentFormLayout from '@/components/agents/agent-form-layout.js'
import {getAgentName} from '@/lib/agents.js'
import {updateZoneInstructorAction} from '@/server/actions/zones.js'

function dateToInputValue(value) {
  return value ? String(value).slice(0, 10) : ''
}

const AgentZoneAccessEditForm = ({agent, habilitation, permissionCatalog}) => {
  const router = useRouter()
  const [form, setForm] = useState({
    startDate: dateToInputValue(habilitation.startDate),
    endDate: dateToInputValue(habilitation.endDate),
    permissions: habilitation.permissions ?? []
  })
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const updateField = (field, value) => setForm(current => ({...current, [field]: value}))

  const submit = async () => {
    setError(null)

    if (!form.startDate || form.permissions.length === 0) {
      setError('La date de début et au moins un droit sont obligatoires.')
      return
    }

    if (form.endDate && form.startDate > form.endDate) {
      setError('La date de fin doit être postérieure à la date de début.')
      return
    }

    setIsSubmitting(true)
    const result = await updateZoneInstructorAction(
      habilitation.zone.id,
      agent.id,
      {
        instructorUserId: agent.id,
        startDate: form.startDate,
        endDate: form.endDate || null,
        permissions: form.permissions,
        notifyAccountCreation: false,
        notifyZoneAttachment: false
      }
    )

    if (!result.success) {
      setError(result.error || 'Impossible de modifier cet accès.')
      setIsSubmitting(false)
      return
    }

    router.push(`/agents/${agent.id}?updated=access-updated`)
    router.refresh({showProgress: false})
  }

  return (
    <AgentFormLayout
      agentId={agent.id}
      description={`Modifiez la période et les droits de ${getAgentName(agent)} sur ${habilitation.zone.name}.`}
      title={`Modifier l’accès à ${habilitation.zone.name}`}
    >
      <div className='flex flex-col gap-5'>
        {error && <Alert description={error} severity='error' title='Enregistrement impossible' />}
        <section className='border border-gray-200 bg-white p-5 md:p-6'>
          <h2 className='fr-h5 fr-mb-2w'>Période d’accès</h2>
          <ZoneAccessFields form={form} updateField={updateField} />
        </section>
        <section className='border border-gray-200 bg-white p-5 md:p-6'>
          <h2 className='fr-h5 fr-mb-1w'>Droits sur la zone</h2>
          <p className='fr-text--sm text-[var(--text-mention-grey)]'>
            Les dépendances nécessaires sont ajoutées automatiquement.
          </p>
          <PermissionFields
            catalog={permissionCatalog}
            permissions={form.permissions}
            setPermissions={permissions => updateField('permissions', permissions)}
          />
        </section>
        <div className='flex flex-wrap justify-end gap-2'>
          <Button priority='secondary' linkProps={{href: `/agents/${agent.id}`}}>Annuler</Button>
          <Button
            disabled={isSubmitting || !form.startDate || form.permissions.length === 0}
            onClick={submit}
          >
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </AgentFormLayout>
  )
}

export default AgentZoneAccessEditForm
