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

function getInitialForm() {
  return {
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    jobTitle: '',
    isAdmin: false,
    startDate: todayAsInputValue(),
    endDate: ''
  }
}

const ZoneInstructorForm = ({zone}) => {
  const router = useRouter()

  const [form, setForm] = useState(getInitialForm)
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
        setError(result.error || 'Impossible d’ajouter cet agent.')
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
      title='Ajouter ou mettre à jour un agent'
      icon={ZONE_ICONS.addUser}
      editorOnly={false}
    >
      <Box className='flex flex-col gap-4'>
        <Alert severity='info'>
          Si l’email correspond déjà à un agent existant sur une autre zone,
          le compte est réutilisé et seul le rattachement à cette zone est créé ou mis à jour.
        </Alert>

        {error && (
          <Alert severity='error'>{error}</Alert>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <TextField
            required
            label='Email'
            type='email'
            value={form.email}
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
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer le rattachement'}
            </Button>
          </Box>
        </Box>
      </Box>
    </SectionCard>
  )
}

export default ZoneInstructorForm
