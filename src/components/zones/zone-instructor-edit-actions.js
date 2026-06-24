'use client'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Box, Divider, Typography} from '@mui/material'

import ImpersonateUserButton from '@/components/auth/impersonate-user-button.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import ZoneInstructorNotificationActions from '@/components/zones/zone-instructor-notification-actions.js'

function getInstructorName(instructor) {
  const fullName = [instructor.firstName, instructor.lastName].filter(Boolean).join(' ').trim()
  return fullName || instructor.email || 'cet agent'
}

const ZoneInstructorEditActions = ({zone, instructor}) => (
  <SectionCard title='Actions' icon={ZONE_ICONS.settings} editorOnly={false}>
    <Box className='flex flex-col gap-4'>
      {!instructor.isCurrentUser && (
        <>
          <div className='flex flex-col gap-2'>
            <Typography variant='subtitle2'>Connexion temporaire</Typography>
            <p className='fr-text--sm fr-mb-0'>
              Ouvrir l’application avec les droits de cet agent pour vérifier son accès.
            </p>
            <ImpersonateUserButton
              label='Prendre la place de cet agent'
              priority='secondary'
              targetLabel={getInstructorName(instructor)}
              targetUserId={instructor.id}
            />
          </div>

          <Divider />
        </>
      )}

      <div className='flex flex-col gap-2'>
        <Typography variant='subtitle2'>Notifications email</Typography>
        <ZoneInstructorNotificationActions zone={zone} instructor={instructor} />
      </div>

      {!instructor.isCurrentUser && (
        <>
          <Divider />

          <div className='flex flex-col gap-2'>
            <Typography variant='subtitle2'>Rattachement à la zone</Typography>
            <p className='fr-text--sm fr-mb-0'>
              Retirer uniquement l’accès de {getInstructorName(instructor)} à cette zone.
            </p>
            <div>
              <Button
                priority='tertiary no outline'
                size='small'
                linkProps={{
                  href: `/zones/${zone.id}/agents/${instructor.id}/supprimer`
                }}
              >
                Retirer de la zone
              </Button>
            </div>
          </div>
        </>
      )}
    </Box>
  </SectionCard>
)

export default ZoneInstructorEditActions
