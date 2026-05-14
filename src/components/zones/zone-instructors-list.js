'use client'

import {useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import SearchBar from '@codegouvfr/react-dsfr/SearchBar'
import {Alert, Box} from '@mui/material'

import ListItem from '@/components/ui/ListItem/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
}

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
  return fullName || instructor.email || 'Agent sans nom'
}

function getInstructorSearchText(instructor) {
  return normalizeSearch([
    instructor.firstName,
    instructor.lastName,
    instructor.email,
    instructor.phoneNumber,
    instructor.jobTitle,
    instructor.isAdmin ? 'admin administrateur' : 'consultation agent'
  ].filter(Boolean).join(' '))
}

const ZoneInstructorsList = ({zone, instructors}) => {
  const [query, setQuery] = useState('')

  const filteredInstructors = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)

    if (!normalizedQuery) {
      return instructors
    }

    return instructors.filter(instructor => getInstructorSearchText(instructor).includes(normalizedQuery))
  }, [instructors, query])

  if (instructors.length === 0) {
    return (
      <Alert severity='info'>
        Aucun agent n’est rattaché à cette zone.
      </Alert>
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      <SearchBar
        allowEmptySearch
        label='Rechercher un agent'
        renderInput={({className, id, placeholder, type}) => (
          <input
            className={className}
            id={id}
            placeholder={placeholder}
            type={type}
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        )}
      />

      {filteredInstructors.length === 0 && (
        <Alert severity='info'>
          Aucun agent ne correspond à cette recherche.
        </Alert>
      )}

      {filteredInstructors.map((instructor, index) => (
        <Box
          key={instructor.id}
          className='flex flex-col md:flex-row gap-2 md:items-stretch'
        >
          <div className='flex-1'>
            <ListItem
              border
              background={index % 2 === 0 ? 'primary' : 'secondary'}
              title={(
                <>
                  <span className={`${ZONE_ICONS.userSettings} mr-2`} />
                  {getInstructorName(instructor)}
                </>
              )}
              subtitle={instructor.email}
              tags={[
                instructor.isAdmin
                  ? {
                    label: 'Admin de zone',
                    severity: 'success'
                  }
                  : {
                    label: 'Consultation',
                    severity: 'info'
                  },
                instructor.isCurrentUser && {
                  label: 'Vous',
                  severity: 'new'
                }
              ].filter(Boolean)}
              metas={[
                instructor.jobTitle && {
                  iconId: ZONE_ICONS.briefcase,
                  content: instructor.jobTitle
                },
                instructor.phoneNumber && {
                  iconId: ZONE_ICONS.phone,
                  content: instructor.phoneNumber
                },
                {
                  iconId: ZONE_ICONS.calendar,
                  content: formatAccessPeriod(instructor.startDate, instructor.endDate)
                }
              ].filter(Boolean)}
            />
          </div>

          {zone.isAdmin && !instructor.isCurrentUser && (
            <div className='flex md:items-center'>
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
          )}
        </Box>
      ))}
    </div>
  )
}

export default ZoneInstructorsList
