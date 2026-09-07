'use client'

import {useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'

import {AgentIdentityFields} from '@/components/agents/agent-form-fields.js'
import AgentFormLayout from '@/components/agents/agent-form-layout.js'
import {getAgentName} from '@/lib/agents.js'
import {
  updateAgentEmailAction,
  updateAgentProfileAction
} from '@/server/actions/agents.js'

function normalize(value) {
  return String(value ?? '').trim()
}

function validateProfileForm(form, accountDisabled) {
  if (!normalize(form.email)) {
    return 'L’email est obligatoire.'
  }

  if (!accountDisabled && (!normalize(form.firstName) || !normalize(form.lastName))) {
    return 'Le prénom et le nom sont obligatoires.'
  }

  if (!accountDisabled && form.phoneNumber && !/^\d{10}$/.test(form.phoneNumber)) {
    return 'Le numéro de téléphone doit contenir 10 chiffres.'
  }

  return null
}

const AgentProfileForm = ({agent}) => {
  const router = useRouter()
  const [form, setForm] = useState({
    email: agent.email ?? '',
    firstName: agent.firstName ?? '',
    lastName: agent.lastName ?? '',
    phoneNumber: agent.phoneNumber ?? '',
    jobTitle: agent.jobTitle ?? ''
  })
  const [error, setError] = useState(null)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const accountDisabled = agent.accountStatus === 'DISABLED'
  const emailChanges = normalize(form.email).toLowerCase() !== normalize(agent.email).toLowerCase()
  const profileChanges = ['firstName', 'lastName', 'phoneNumber', 'jobTitle']
    .some(field => normalize(form[field]) !== normalize(agent[field]))
  const hasChanges = emailChanges || (!accountDisabled && profileChanges)
  const updateField = (field, value) => setForm(current => ({...current, [field]: value}))

  const saveProfile = async () => {
    if (accountDisabled || !profileChanges) {
      return {success: true, data: agent}
    }

    return updateAgentProfileAction(agent.id, {
      firstName: normalize(form.firstName),
      lastName: normalize(form.lastName),
      phoneNumber: normalize(form.phoneNumber) || null,
      jobTitle: normalize(form.jobTitle) || null,
      expectedUpdatedAt: agent.updatedAt
    })
  }

  const saveEmail = async () => {
    if (!emailChanges) {
      return {success: true, data: agent}
    }

    return updateAgentEmailAction(agent.id, {
      email: normalize(form.email),
      expectedCurrentEmail: agent.email
    })
  }

  const save = async () => {
    setError(null)
    const validationError = validateProfileForm(form, accountDisabled)

    if (validationError) {
      setError(validationError)
      return
    }

    if (emailChanges && !emailDialogOpen) {
      setEmailDialogOpen(true)
      return
    }

    setIsSubmitting(true)
    const profileResult = await saveProfile()

    if (!profileResult.success) {
      setError(profileResult.error || 'Impossible de modifier le profil.')
      setIsSubmitting(false)
      return
    }

    const emailResult = await saveEmail()

    if (!emailResult.success) {
      setError(!accountDisabled && profileChanges
        ? `Le profil a été enregistré, mais l’email n’a pas été modifié : ${emailResult.error}`
        : emailResult.error || 'Impossible de modifier l’email.')
      setEmailDialogOpen(false)
      setIsSubmitting(false)
      router.refresh({showProgress: false})
      return
    }

    const updateKey = emailChanges
      ? (emailResult.data?.warnings?.length > 0 ? 'email-warning' : 'email')
      : 'profile'

    router.push(`/agents/${agent.id}?updated=${updateKey}`)
    router.refresh({showProgress: false})
  }

  return (
    <AgentFormLayout
      agentId={agent.id}
      description={`Modifiez les informations de ${getAgentName(agent)}. Les accès aux zones se gèrent depuis sa fiche.`}
      title='Modifier l’agent'
    >
      <div className='flex flex-col gap-5'>
        {error && <Alert description={error} severity='error' title='Enregistrement impossible' />}
        {accountDisabled && (
          <Alert
            description='Le profil reste inchangé tant que le compte est désactivé. Vous pouvez toutefois corriger directement son adresse email.'
            severity='info'
            title='Compte désactivé'
          />
        )}
        <section className='border border-gray-200 bg-white p-5 md:p-6'>
          <h2 className='fr-h5 fr-mb-2w'>Identité et coordonnées</h2>
          <AgentIdentityFields
            form={form}
            profileDisabled={accountDisabled}
            updateField={updateField}
          />
        </section>
        <div className='flex flex-wrap justify-end gap-2'>
          <Button priority='secondary' linkProps={{href: `/agents/${agent.id}`}}>Annuler</Button>
          <Button disabled={isSubmitting || !hasChanges} onClick={save}>
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <Dialog fullWidth maxWidth='sm' open={emailDialogOpen} onClose={isSubmitting ? undefined : () => setEmailDialogOpen(false)}>
        <DialogTitle>Confirmer le changement d’email</DialogTitle>
        <DialogContent dividers>
          <p className='fr-text--sm'>
            {agent.email
              ? <>L’adresse de connexion passera de <strong>{agent.email}</strong> à <strong>{normalize(form.email)}</strong>.</>
              : <>L’adresse de connexion sera <strong>{normalize(form.email)}</strong>.</>}
          </p>
          <p className='fr-text--sm fr-mb-0'>
            Les sessions de l’agent seront révoquées. Il devra se reconnecter avec sa nouvelle adresse.
          </p>
        </DialogContent>
        <DialogActions className='m-3'>
          <Button disabled={isSubmitting} priority='secondary' onClick={() => setEmailDialogOpen(false)}>Annuler</Button>
          <Button disabled={isSubmitting} onClick={save}>Confirmer le changement</Button>
        </DialogActions>
      </Dialog>
    </AgentFormLayout>
  )
}

export default AgentProfileForm
