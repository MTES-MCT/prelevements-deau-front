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
import {matchesSearchTerms} from '@/lib/search-options.js'
import {
  formatAccessPeriod,
  getHabilitationRoleLabel,
  getInstructorName,
  pluralize
} from '@/lib/zone-instructors.js'

const CLIENT_PAGE_SIZE = 20

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
}

function getInstructorSearchText(instructor) {
  return normalizeSearch([
    instructor.firstName,
    instructor.lastName,
    instructor.email,
    instructor.phoneNumber,
    instructor.jobTitle,
    instructor.isAdmin ? 'acces complet' : `${instructor.permissions?.length || 0} droits`
  ].filter(Boolean).join(' '))
}

const ZoneInstructorsList = ({zone, instructors}) => {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const debouncedQuery = useDebouncedValue(query)

  const filteredInstructors = useMemo(() => instructors.filter(instructor => matchesSearchTerms(
    getInstructorSearchText(instructor),
    debouncedQuery
  )), [instructors, debouncedQuery])

  const pages = Math.max(1, Math.ceil(filteredInstructors.length / CLIENT_PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const visibleInstructors = filteredInstructors.slice((currentPage - 1) * CLIENT_PAGE_SIZE, currentPage * CLIENT_PAGE_SIZE)

  if (instructors.length === 0) {
    return (
      <div className='flex flex-col gap-4'>
        <Alert severity='info'>
          Aucun agent n’est rattaché à cette zone.
        </Alert>

        {zone.permissions?.includes('zone.agent.create') && (
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
          {zone.permissions?.includes('zone.agent.export') && (
            <ZoneExportButton
              columns={ZONE_INSTRUCTORS_EXPORT_COLUMNS}
              filename={`agents-zone-${zone.code || zone.id}.xlsx`}
              rows={filteredInstructors}
              sheetName='Agents'
            />
          )}

          {zone.permissions?.includes('zone.agent.create') && (
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
                {
                  label: getHabilitationRoleLabel(instructor),
                  severity: instructor.isAdmin ? 'success' : 'info'
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

          {zone.permissions?.includes('zone.agent.detail.read') && (
            <div className='flex gap-2 md:items-center md:flex-col md:justify-center'>
              <Button
                priority='tertiary no outline'
                size='small'
                linkProps={{
                  href: `/zones/${zone.id}/agents/${instructor.id}`
                }}
              >
                Voir
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
