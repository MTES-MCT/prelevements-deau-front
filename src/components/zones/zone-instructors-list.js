'use client'

import {useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import SearchBar from '@codegouvfr/react-dsfr/SearchBar'
import {Alert, Box} from '@mui/material'

import ListItem from '@/components/ui/ListItem/index.js'
import ZoneExportButton from '@/components/zones/zone-export-button.js'
import {ZONE_INSTRUCTORS_EXPORT_COLUMNS} from '@/components/zones/zone-export-columns.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import useDebouncedValue from '@/hook/use-debounced-value.js'

const CLIENT_PAGE_SIZE = 20

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
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
  const [page, setPage] = useState(1)
  const debouncedQuery = useDebouncedValue(query)

  const filteredInstructors = useMemo(() => {
    const normalizedQuery = normalizeSearch(debouncedQuery)

    if (!normalizedQuery) {
      return instructors
    }

    return instructors.filter(instructor => getInstructorSearchText(instructor).includes(normalizedQuery))
  }, [instructors, debouncedQuery])

  const pages = Math.max(1, Math.ceil(filteredInstructors.length / CLIENT_PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const visibleInstructors = filteredInstructors.slice((currentPage - 1) * CLIENT_PAGE_SIZE, currentPage * CLIENT_PAGE_SIZE)

  if (instructors.length === 0) {
    return (
      <div className='flex flex-col gap-4'>
        <Alert severity='info'>
          Aucun agent n’est rattaché à cette zone.
        </Alert>

        {zone.isAdmin && (
          <div>
            <Button iconId={ZONE_ICONS.addUser} linkProps={{href: `/zones/${zone.id}/agents/ajouter`}}>
              Ajouter un agent
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-3'>
        <div>
          <p className='fr-text--lead fr-mb-0'>
            {pluralize(visibleInstructors.length, 'agent affiché', 'agents affichés')}
          </p>
          <p className='fr-text--sm fr-mb-0'>
            {debouncedQuery ? `${pluralize(filteredInstructors.length, 'résultat')} pour la recherche, ${pluralize(instructors.length, 'agent')} dans la zone` : `${pluralize(instructors.length, 'agent')} dans la zone`}
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <ZoneExportButton
            columns={ZONE_INSTRUCTORS_EXPORT_COLUMNS}
            filename={`agents-zone-${zone.code || zone.id}.xlsx`}
            rows={filteredInstructors}
            sheetName='Agents'
          />

          {zone.isAdmin && (
            <Button iconId={ZONE_ICONS.addUser} linkProps={{href: `/zones/${zone.id}/agents/ajouter`}}>
              Ajouter un agent
            </Button>
          )}
        </div>
      </div>

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
            onChange={event => {
              setPage(1)
              setQuery(event.target.value)
            }}
          />
        )}
      />

      {visibleInstructors.length === 0 && (
        <Alert severity='info'>
          Aucun agent ne correspond à cette recherche.
        </Alert>
      )}

      {visibleInstructors.map((instructor, index) => (
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

          {zone.isAdmin && (
            <div className='flex gap-2 md:items-center md:flex-col md:justify-center'>
              <Button
                priority='tertiary no outline'
                size='small'
                linkProps={{
                  href: `/zones/${zone.id}/agents/${instructor.id}/modifier`
                }}
              >
                Modifier
              </Button>
            </div>
          )}
        </Box>
      ))}

      {pages > 1 && (
        <div className='flex gap-2 items-center justify-end'>
          <Button disabled={currentPage <= 1} priority='tertiary no outline' size='small' onClick={() => setPage(currentPage - 1)}>
            Précédent
          </Button>
          <span className='fr-text--sm fr-mb-0'>Page {currentPage} / {pages}</span>
          <Button disabled={currentPage >= pages} priority='tertiary no outline' size='small' onClick={() => setPage(currentPage + 1)}>
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
}

export default ZoneInstructorsList
