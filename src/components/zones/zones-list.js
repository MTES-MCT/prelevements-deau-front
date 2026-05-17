'use client'

import {useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Alert} from '@mui/material'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import useDebouncedValue from '@/hook/use-debounced-value.js'

const ZONE_TYPE_LABELS = {
  REGION: 'Région',
  DEPARTEMENT: 'Département',
  SAGE: 'SAGE'
}

const PAGE_SIZE = 24

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
}

function getZoneActivityCount(zone) {
  return Number(zone.pointsCount ?? zone.declarantsCount ?? 0)
}

function getZoneSearchText(zone) {
  return normalizeSearch([
    zone.name,
    zone.code,
    zone.type,
    ZONE_TYPE_LABELS[zone.type],
    zone.isAdmin ? 'admin administrateur' : 'consultation'
  ].filter(Boolean).join(' '))
}

const ZonesList = ({zones}) => {
  const [tab, setTab] = useState('active')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const debouncedQuery = useDebouncedValue(query)

  const activeZones = useMemo(() => zones.filter(zone => getZoneActivityCount(zone) > 0), [zones])
  const emptyZones = useMemo(() => zones.filter(zone => getZoneActivityCount(zone) === 0), [zones])
  const showTabs = activeZones.length > 0 && emptyZones.length > 0
  const selectedZones = showTabs && tab === 'empty' ? emptyZones : (activeZones.length > 0 ? activeZones : zones)

  const filteredZones = useMemo(() => {
    const normalizedQuery = normalizeSearch(debouncedQuery)

    if (!normalizedQuery) {
      return selectedZones
    }

    return selectedZones.filter(zone => getZoneSearchText(zone).includes(normalizedQuery))
  }, [debouncedQuery, selectedZones])

  const pages = Math.max(1, Math.ceil(filteredZones.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const visibleZones = filteredZones.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (zones.length === 0) {
    return (
      <Alert severity='info'>
        Aucune zone active n’est rattachée à votre compte instructeur.
      </Alert>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      {showTabs && (
        <div className='flex gap-2 flex-wrap'>
          <Button
            priority={tab === 'active' ? 'primary' : 'tertiary no outline'}
            size='small'
            onClick={() => {
              setPage(1)
              setTab('active')
            }}
          >
            Zones avec activité ({activeZones.length})
          </Button>
          <Button
            priority={tab === 'empty' ? 'primary' : 'tertiary no outline'}
            size='small'
            onClick={() => {
              setPage(1)
              setTab('empty')
            }}
          >
            Zones sans déclarant ({emptyZones.length})
          </Button>
        </div>
      )}

      <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-3'>
        <div>
          <p className='fr-text--lead fr-mb-0'>
            {pluralize(visibleZones.length, 'zone affichée', 'zones affichées')}
          </p>
          <p className='fr-text--sm fr-mb-0'>
            {debouncedQuery
              ? `${pluralize(filteredZones.length, 'résultat')} pour la recherche, ${pluralize(selectedZones.length, 'zone')} dans l’onglet`
              : `${pluralize(selectedZones.length, 'zone')} dans l’onglet`}
          </p>
        </div>
      </div>

      <div className='fr-input-group fr-mb-0'>
        <label className='fr-label' htmlFor='zones-search'>Rechercher une zone</label>
        <input
          className='fr-input'
          id='zones-search'
          placeholder='Nom, code, type de zone…'
          type='search'
          value={query}
          onChange={event => {
            setPage(1)
            setQuery(event.target.value)
          }}
        />
        <p className='fr-hint-text fr-mt-1w'>La recherche est temporisée pour garder une navigation fluide.</p>
      </div>

      {visibleZones.length === 0 && (
        <Alert severity='info'>Aucune zone ne correspond à cette recherche.</Alert>
      )}

      <div className='flex flex-col gap-3'>
        {visibleZones.map((zone, index) => (
          <Link key={zone.id} href={`/zones/${zone.id}`}>
            <ListItem
              border
              background={index % 2 === 0 ? 'primary' : 'secondary'}
              title={(
                <>
                  <span className={`${ZONE_ICONS.mapPin2} mr-2`} />
                  {zone.name}
                </>
              )}
              subtitle={`${ZONE_TYPE_LABELS[zone.type] || zone.type} — ${zone.code}`}
              tags={[
                zone.isAdmin
                  ? {
                    label: 'Administration complète',
                    severity: 'success'
                  }
                  : {
                    label: 'Consultation',
                    severity: 'info'
                  },
                getZoneActivityCount(zone) === 0 && {
                  label: 'Sans déclarant',
                  severity: 'warning'
                }
              ].filter(Boolean)}
              metas={[
                zone.pointsCount !== undefined && {
                  iconId: ZONE_ICONS.water,
                  content: pluralize(zone.pointsCount || 0, 'point')
                },
                {
                  iconId: ZONE_ICONS.user,
                  content: pluralize(zone.declarantsCount || 0, 'déclarant')
                },
                zone.exploitationsCount !== undefined && {
                  iconId: ZONE_ICONS.briefcase,
                  content: pluralize(zone.exploitationsCount || 0, 'exploitation')
                },
                {
                  iconId: ZONE_ICONS.team,
                  content: pluralize(zone.instructorsCount || 0, 'agent')
                }
              ].filter(Boolean)}
            />
          </Link>
        ))}
      </div>

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

export default ZonesList
