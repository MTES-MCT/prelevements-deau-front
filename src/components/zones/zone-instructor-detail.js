'use client'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Box,
  Chip,
  Typography
} from '@mui/material'

import ImpersonateUserButton from '@/components/auth/impersonate-user-button.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import ZoneInstructorNotificationActions from '@/components/zones/zone-instructor-notification-actions.js'
import ZoneInstructorRemoveAction from '@/components/zones/zone-instructor-remove-action.js'
import {
  formatAccessPeriod,
  getHabilitationRoleLabel,
  getHabilitationStatusLabel,
  getHabilitationStatusSeverity,
  getInstructorName
} from '@/lib/zone-instructors.js'

const Field = ({label, value}) => {
  if (!value) {
    return null
  }

  return (
    <div>
      <p className='fr-text--xs fr-mb-0'>{label}</p>
      <p className='fr-text--sm fr-mb-0'>{value}</p>
    </div>
  )
}

const HabilitationStatusChip = ({habilitation}) => {
  if (!habilitation.status || habilitation.status === 'ACTIVE') {
    return null
  }

  return (
    <Chip
      color={getHabilitationStatusSeverity(habilitation.status)}
      label={getHabilitationStatusLabel(habilitation.status)}
      size='small'
    />
  )
}

const HabilitationRow = ({habilitation}) => (
  <Box
    className='grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto] gap-2 md:items-center fr-p-2w'
    sx={{border: '1px solid var(--border-default-grey)'}}
  >
    <div>
      <Typography variant='body2'>{habilitation.zone?.name || 'Zone sans nom'}</Typography>
      {habilitation.zone?.type && (
        <p className='fr-text--xs fr-mb-0'>{habilitation.zone.type}</p>
      )}
    </div>

    <p className='fr-text--sm fr-mb-0'>
      {formatAccessPeriod(habilitation.startDate, habilitation.endDate)}
    </p>

    <Box className='flex flex-wrap gap-1 md:justify-end'>
      <Chip label={getHabilitationRoleLabel(habilitation)} size='small' variant='outlined' />
      <HabilitationStatusChip habilitation={habilitation} />
    </Box>
  </Box>
)

const AgentActions = ({zone, instructor}) => {
  if (instructor.isCurrentUser) {
    return null
  }

  return (
    <Box className='flex flex-col gap-2'>
      <ImpersonateUserButton
        label='Prendre sa place'
        priority='tertiary no outline'
        targetLabel={getInstructorName(instructor)}
        targetUserId={instructor.id}
      />

      {zone.permissions?.includes('zone.agent.notify') && (
        <ZoneInstructorNotificationActions
          instructor={instructor}
          type='account'
          zone={zone}
        />
      )}
    </Box>
  )
}

const ZoneAccessActions = ({zone, instructor}) => (
  <Box className='flex flex-col gap-2'>
    <Box className='flex flex-wrap gap-2'>
      {zone.permissions?.includes('zone.agent.update') && !instructor.isCurrentUser && (
        <Button
          priority='secondary'
          size='small'
          linkProps={{
            href: `/zones/${zone.id}/agents/${instructor.id}/modifier`
          }}
        >
          Changer les droits ou la période
        </Button>
      )}

      {zone.permissions?.includes('zone.agent.remove') && !instructor.isCurrentUser && (
        <ZoneInstructorRemoveAction zone={zone} instructor={instructor} />
      )}
    </Box>

    {zone.permissions?.includes('zone.agent.notify') && (
      <ZoneInstructorNotificationActions
        instructor={instructor}
        type='attachment'
        zone={zone}
      />
    )}
  </Box>
)

const PermissionDetails = ({catalog, permissions = []}) => {
  const selected = new Set(permissions)
  const groups = catalog.groups
    .map(group => ({
      ...group,
      permissions: group.permissions.filter(permission => selected.has(permission.code))
    }))
    .filter(group => group.permissions.length > 0)

  return (
    <details className='border-t border-gray-200 pt-3'>
      <summary className='cursor-pointer fr-text--sm fr-text--bold'>
        {permissions.length === 1 ? '1 droit attribué' : `${permissions.length} droits attribués`}
      </summary>
      <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2'>
        {groups.map(group => (
          <div key={group.code}>
            <p className='fr-text--xs fr-text--bold fr-mb-1v'>{group.label}</p>
            <ul className='fr-text--xs fr-mb-0 pl-4'>
              {group.permissions.map(permission => (
                <li key={permission.code}>{permission.label}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  )
}

const ZoneInstructorDetail = ({zone, instructor, permissionCatalog}) => {
  const currentHabilitation = instructor.habilitations?.find(habilitation => habilitation.isCurrentZone) || {
    isAdmin: instructor.isAdmin,
    permissions: instructor.permissions,
    startDate: instructor.startDate,
    endDate: instructor.endDate,
    status: instructor.status,
    zoneAttachmentMailSentAt: instructor.zoneAttachmentMailSentAt
  }
  const otherHabilitations = instructor.otherHabilitations || []

  return (
    <Box className='flex flex-col gap-4'>
      <SectionCard title='Agent' icon={ZONE_ICONS.userSettings} editorOnly={false}>
        <Box className='flex flex-col gap-3'>
          <Box className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Field label='Agent' value={getInstructorName(instructor)} />
            <Field label='Email' value={instructor.email} />
            <Field label='Fonction' value={instructor.jobTitle} />
            <Field label='Téléphone' value={instructor.phoneNumber} />
          </Box>

          <AgentActions zone={zone} instructor={instructor} />
        </Box>
      </SectionCard>

      <SectionCard title='Accès à cette zone' icon={ZONE_ICONS.shieldCheck} editorOnly={false}>
        <Box className='flex flex-col gap-4'>
          <Box className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Field label='Rôle' value={getHabilitationRoleLabel(currentHabilitation)} />
            <Field label='Période' value={formatAccessPeriod(currentHabilitation.startDate, currentHabilitation.endDate)} />
          </Box>

          <HabilitationStatusChip habilitation={currentHabilitation} />

          <PermissionDetails
            catalog={permissionCatalog}
            permissions={currentHabilitation.permissions || []}
          />

          {['zone.agent.update', 'zone.agent.remove', 'zone.agent.notify'].some(permission => zone.permissions?.includes(permission)) && (
            <ZoneAccessActions zone={zone} instructor={instructor} />
          )}
        </Box>
      </SectionCard>

      <SectionCard title='Autres zones' icon={ZONE_ICONS.mapPin2} editorOnly={false}>
        {otherHabilitations.length === 0 ? (
          <p className='fr-text--sm fr-mb-0'>
            Aucune autre zone rattachée à cet agent.
          </p>
        ) : (
          <Box className='flex flex-col gap-2'>
            {otherHabilitations.map(habilitation => (
              <HabilitationRow key={habilitation.id} habilitation={habilitation} />
            ))}
          </Box>
        )}
      </SectionCard>
    </Box>
  )
}

export default ZoneInstructorDetail
