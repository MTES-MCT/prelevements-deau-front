'use client'

import {useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Alert,
  Box,
  TextField,
  Typography
} from '@mui/material'
import {useRouter} from 'next/navigation'

import SectionCard from '@/components/ui/SectionCard/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import {deleteZoneInstructorAction} from '@/server/actions/zones.js'

function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR').format(new Date(date))
}

function formatAccessPeriod(startDate, endDate) {
  if (!startDate && !endDate) {
    return 'Accès permanent'
  }

  if (!startDate) {
    return `Jusqu’au ${formatDate(endDate)}`
  }

  if (!endDate) {
    const start = new Date(startDate)
    const now = new Date()

    return start > now
      ? `À partir du ${formatDate(startDate)}`
      : `Depuis le ${formatDate(startDate)}`
  }

  return `Du ${formatDate(startDate)} au ${formatDate(endDate)}`
}

function getInstructorName(instructor) {
  const fullName = [instructor.firstName, instructor.lastName].filter(Boolean).join(' ').trim()
  return fullName || instructor.email || 'cet agent'
}

const ZoneInstructorDeleteCard = ({zone, instructor}) => {
  const router = useRouter()

  const [error, setError] = useState(null)
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const isConfirmed = confirmationEmail.trim().toLowerCase() === instructor.email.toLowerCase()

  const handleDelete = async () => {
    setError(null)
    setIsDeleting(true)

    try {
      const result = await deleteZoneInstructorAction(zone.id, instructor.id)

      if (!result.success) {
        setError(result.error || 'Impossible de retirer cet agent de la zone.')
        setIsDeleting(false)
        return
      }

      router.push(`/zones/${zone.id}/agents`)
      router.refresh()
    } catch (error) {
      setError(error.message)
      setIsDeleting(false)
    }
  }

  return (
    <SectionCard
      title='Retirer un agent de la zone'
      icon={ZONE_ICONS.userUnfollow}
      editorOnly={false}
    >
      <Box className='flex flex-col gap-4'>
        <Alert severity='warning'>
          Cette action retire uniquement le rattachement à la zone.
          Le compte utilisateur n’est pas supprimé.
        </Alert>

        {error && (
          <Alert severity='error'>{error}</Alert>
        )}

        <div>
          <Typography variant='h6'>
            {getInstructorName(instructor)}
          </Typography>
          <p className='fr-text--sm fr-mb-0'>{instructor.email}</p>
          <p className='fr-text--sm fr-mb-0'>
            {formatAccessPeriod(instructor.startDate, instructor.endDate)}
          </p>
          {instructor.isAdmin && (
            <p className='fr-text--sm fr-mb-0'>
              Cet agent est admin de la zone. La suppression sera refusée s’il s’agit du dernier admin actif.
            </p>
          )}
        </div>

        <TextField
          label='Confirmez l’email de l’instructeur'
          value={confirmationEmail}
          helperText={`Saisissez ${instructor.email} pour confirmer.`}
          onChange={event => setConfirmationEmail(event.target.value)}
        />

        <Box className='flex justify-end gap-2 flex-wrap'>
          <Button
            priority='secondary'
            linkProps={{
              href: `/zones/${zone.id}/agents`
            }}
          >
            Annuler
          </Button>

          <Button
            disabled={isDeleting || !isConfirmed}
            onClick={handleDelete}
          >
            {isDeleting ? 'Suppression en cours…' : 'Retirer de la zone'}
          </Button>
        </Box>
      </Box>
    </SectionCard>
  )
}

export default ZoneInstructorDeleteCard
