'use client'

import {useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography
} from '@mui/material'
import {useRouter} from 'next/navigation'

import SectionCard from '@/components/ui/SectionCard/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import {addZoneInstructorAction} from '@/server/actions/zones.js'

function todayAsInputValue() {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60_000

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10)
}

function dateToInputValue(value) {
  if (!value) {
    return ''
  }

  return String(value).slice(0, 10)
}

function getInitialForm(instructor) {
  return {
    email: instructor?.email || '',
    firstName: instructor?.firstName || '',
    lastName: instructor?.lastName || '',
    phoneNumber: instructor?.phoneNumber || '',
    jobTitle: instructor?.jobTitle || '',
    isAdmin: Boolean(instructor?.isAdmin),
    startDate: dateToInputValue(instructor?.startDate) || todayAsInputValue(),
    endDate: dateToInputValue(instructor?.endDate),
    notifyAccountCreation: false,
    notifyZoneAttachment: false
  }
}

const ZoneInstructorForm = ({zone, instructor = null}) => {
  const router = useRouter()
  const isEditing = Boolean(instructor)

  const [form, setForm] = useState(() => getInitialForm(instructor))
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isDisabled = isSubmitting || !form.email.trim() || !form.startDate

  const updateField = (field, value) => {
    setForm(current => ({
      ...current,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
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

    try {
      const result = await addZoneInstructorAction(zone.id, {
        ...form,
        endDate: form.endDate || null
      })

      if (!result.success) {
        setError(result.error || (isEditing ? 'Impossible de modifier cet agent.' : 'Impossible d’ajouter cet agent.'))
        setIsSubmitting(false)
        return
      }

      router.push(`/zones/${zone.id}/agents`)
      router.refresh()
    } catch (error) {
      setError(error.message)
      setIsSubmitting(false)
    }
  }

  return (
    <SectionCard
      title={isEditing ? 'Modifier l’agent' : 'Ajouter ou mettre à jour un agent'}
      icon={isEditing ? ZONE_ICONS.edit : ZONE_ICONS.addUser}
      editorOnly={false}
    >
      <Box className='flex flex-col gap-4'>
        {!isEditing && (
          <Alert severity='info'>
            Si l’email correspond déjà à un agent existant sur une autre zone,
            le compte est réutilisé et seul le rattachement à cette zone est créé ou mis à jour.
          </Alert>
        )}

        {error && (
          <Alert severity='error'>{error}</Alert>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <TextField
            required
            disabled={isEditing}
            label='Email'
            type='email'
            value={form.email}
            helperText={isEditing ? 'L’email identifie le compte agent et ne peut pas être modifié ici.' : undefined}
            onChange={event => updateField('email', event.target.value)}
          />

          <TextField
            label='Fonction'
            value={form.jobTitle}
            onChange={event => updateField('jobTitle', event.target.value)}
          />

          <TextField
            required
            label='Prénom'
            value={form.firstName}
            onChange={event => updateField('firstName', event.target.value)}
          />

          <TextField
            required
            label='Nom'
            value={form.lastName}
            onChange={event => updateField('lastName', event.target.value)}
          />

          <TextField
            label='Téléphone'
            value={form.phoneNumber}
            helperText='10 chiffres, sans espace'
            onChange={event => updateField('phoneNumber', event.target.value)}
          />

          <TextField
            required
            label='Date de début'
            type='date'
            value={form.startDate}
            InputLabelProps={{
              shrink: true
            }}
            onChange={event => updateField('startDate', event.target.value)}
          />

          <TextField
            label='Date de fin'
            type='date'
            value={form.endDate}
            InputLabelProps={{
              shrink: true
            }}
            onChange={event => updateField('endDate', event.target.value)}
          />

          <FormControlLabel
            control={(
              <Checkbox
                checked={form.isAdmin}
                onChange={event => updateField('isAdmin', event.target.checked)}
              />
            )}
            label='Admin de la zone'
          />
        </div>

        {!isEditing && (
          <Box className='flex flex-col gap-2 fr-background-alt--grey fr-p-3w'>
            <Typography variant='subtitle2'>Notifications email</Typography>

            <FormControlLabel
              control={(
                <Checkbox
                  checked={form.notifyAccountCreation}
                  onChange={event => updateField('notifyAccountCreation', event.target.checked)}
                />
              )}
              label='Notifier l’agent de la création ou disponibilité de son compte'
            />

            <FormControlLabel
              control={(
                <Checkbox
                  checked={form.notifyZoneAttachment}
                  onChange={event => updateField('notifyZoneAttachment', event.target.checked)}
                />
              )}
              label='Notifier l’agent de son rattachement à cette zone'
            />
          </Box>
        )}

        <Box className='flex justify-between items-center gap-3 flex-wrap'>
          <Typography variant='body2'>
            Les champs fonction et téléphone sont optionnels.
          </Typography>

          <Box className='flex gap-2'>
            <Button
              priority='secondary'
              linkProps={{
                href: `/zones/${zone.id}/agents`
              }}
            >
              Annuler
            </Button>

            <Button disabled={isDisabled} onClick={handleSubmit}>
              {isSubmitting ? 'Enregistrement…' : (isEditing ? 'Enregistrer les modifications' : 'Enregistrer le rattachement')}
            </Button>
          </Box>
        </Box>
      </Box>
    </SectionCard>
  )
}

export default ZoneInstructorForm
