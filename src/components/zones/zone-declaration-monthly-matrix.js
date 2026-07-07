'use client'

import {useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Alert, Box} from '@mui/material'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import {formatUsages} from '@/lib/water-uses.js'

const CELL_LABELS = {
  DECLARED: 'Déclaration déposée',
  MISSING: 'Déclaration attendue',
  INACTIVE: 'Hors période'
}

const CELL_STYLES = {
  DECLARED: {
    backgroundColor: '#b8fec9',
    borderColor: '#18753c'
  },
  MISSING: {
    backgroundColor: '#ffe9e6',
    borderColor: '#ce0500'
  },
  INACTIVE: {
    backgroundColor: '#eeeeee',
    borderColor: '#dddddd'
  }
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
}

function formatDateTime(value) {
  if (!value) {
    return 'Jamais connecté'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Date inconnue'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function buildSearchText(row) {
  return normalize([
    row.declarantLabel,
    row.declarantEmail,
    row.pointName,
    row.exploitationStatus,
    ...(row.collecteurs ?? []).flatMap(collecteur => [collecteur.label, collecteur.email]),
    row.usage ? formatUsages([row.usage]) : null,
    formatUsages(row.usages ?? [])
  ].filter(Boolean).join(' '))
}

function getCellTitle(row, cell) {
  const base = `${row.declarantLabel} / ${row.pointName} / ${cell.period || cell.month}`

  if (cell.status === 'DECLARED') {
    const codes = cell.declarations.map(declaration => declaration.code).filter(Boolean).join(', ')
    const actors = [
      ...new Set(cell.declarations.map(declaration => declaration.createdByDeclarantLabel).filter(Boolean))
    ].join(', ')

    return [
      base,
      `${pluralize(cell.declarationsCount, 'déclaration')} déposée${cell.declarationsCount > 1 ? 's' : ''}`,
      codes ? `Dossier(s) : ${codes}` : null,
      actors ? `Déposé par : ${actors}` : null
    ].filter(Boolean).join('\n')
  }

  if (cell.status === 'MISSING') {
    return `${base}\nDéclaration attendue, aucune déclaration trouvée sur cette période.`
  }

  return `${base}\nExploitation inactive ou hors période.`
}

function flattenGroups(groups) {
  return groups.flatMap(group => group.rows.map((row, index) => ({
    group,
    row,
    groupRowIndex: index,
    groupSize: group.rows.length
  })))
}

function setQuery(router, pathname, searchParams, values) {
  const params = new URLSearchParams(searchParams.toString())

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') {
      params.delete(key)
    } else {
      params.set(key, String(value))
    }
  }

  const query = params.toString()
  router.replace(query ? `${pathname}?${query}` : pathname, {scroll: false})
}

const PeriodControls = ({periodType, periods, zoneId}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedPeriodCount = Number(searchParams.get('periodCount') || searchParams.get('months') || 12)
  const exportPeriod = periods.at(-1)?.key

  return (
    <div className='flex flex-wrap gap-2 items-center justify-end'>
      <span className='fr-text--sm fr-mb-0'>Vue</span>
      {[
        {value: 'month', label: 'Mois'},
        {value: 'week', label: 'Semaines'}
      ].map(option => (
        <Button
          key={option.value}
          priority={periodType === option.value ? 'primary' : 'tertiary no outline'}
          size='small'
          onClick={() => setQuery(router, pathname, searchParams, {
            periodType: option.value,
            periodCount: selectedPeriodCount,
            months: undefined,
            to: undefined
          })}
        >
          {option.label}
        </Button>
      ))}
      <span className='fr-text--sm fr-mb-0 ml-2'>Périodes</span>
      {[8, 12, 18, 24, 36].map(value => (
        <Button
          key={value}
          priority={selectedPeriodCount === value ? 'primary' : 'tertiary no outline'}
          size='small'
          onClick={() => setQuery(router, pathname, searchParams, {
            periodCount: value,
            months: undefined
          })}
        >
          {value}
        </Button>
      ))}
      {exportPeriod && zoneId && (
        <a
          className='fr-btn fr-btn--secondary fr-btn--sm'
          href={`/api/zones/${zoneId}/suivi-declarations/export?periodType=${periodType}&to=${exportPeriod}&periodCount=${selectedPeriodCount}`}
          title='Exporter les lignes manquantes des périodes affichées'
        >
          Exporter les manquants
        </a>
      )}
    </div>
  )
}

const MatrixCell = ({row, cell}) => {
  const style = CELL_STYLES[cell.status] ?? CELL_STYLES.INACTIVE
  const label = CELL_LABELS[cell.status] ?? cell.status

  return (
    <td
      className='p-0 text-center align-middle'
      title={getCellTitle(row, cell)}
      aria-label={`${label} pour ${row.pointName} sur ${cell.period || cell.month}`}
      style={{
        minWidth: 22,
        width: 22,
        height: 22,
        border: '1px solid var(--border-default-grey)'
      }}
    >
      <span
        className='inline-flex items-center justify-center text-[10px] font-bold rounded-sm'
        style={{
          width: 16,
          height: 16,
          lineHeight: '16px',
          border: `1px solid ${style.borderColor}`,
          backgroundColor: style.backgroundColor,
          color: cell.status === 'INACTIVE' ? '#666666' : '#161616'
        }}
      >
        {cell.status === 'DECLARED' ? (cell.declarationsCount > 1 ? cell.declarationsCount : '✓') : (cell.status === 'MISSING' ? '!' : '·')}
      </span>
    </td>
  )
}

const ZoneDeclarationMonthlyMatrix = ({payload}) => {
  const groups = useMemo(() => payload?.data?.groups ?? [], [payload?.data?.groups])
  const periods = payload?.data?.periods ?? payload?.data?.months ?? []
  const periodType = payload?.data?.periodType ?? payload?.meta?.periodType ?? 'month'
  const zoneId = payload?.meta?.zoneId
  const summary = payload?.meta?.summary ?? {}
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filteredGroups = useMemo(() => {
    const query = normalize(search)

    return groups
      .map(group => {
        const rows = group.rows.filter(row => {
          const matchesSearch = !query || buildSearchText(row).includes(query)
          const matchesStatus = statusFilter === 'ALL' || row.cells.some(cell => cell.status === statusFilter)
          return matchesSearch && matchesStatus
        })

        return {
          ...group,
          rows
        }
      })
      .filter(group => group.rows.length > 0)
  }, [groups, search, statusFilter])

  const flattenedRows = flattenGroups(filteredGroups)

  if (groups.length === 0) {
    return (
      <Alert severity='info'>
        Aucune exploitation de préleveur n’est disponible dans cette zone pour construire le suivi.
      </Alert>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
        <div className='fr-card fr-card--sm fr-card--grey fr-p-3w'>
          <p className='fr-text--sm fr-mb-1w'>Exploitations suivies</p>
          <p className='fr-h4 fr-mb-0'>{summary.rows ?? 0}</p>
        </div>
        <div className='fr-card fr-card--sm fr-card--grey fr-p-3w'>
          <p className='fr-text--sm fr-mb-1w'>Déclarations trouvées</p>
          <p className='fr-h4 fr-mb-0'>{summary.declared ?? 0}</p>
        </div>
        <div className='fr-card fr-card--sm fr-card--grey fr-p-3w'>
          <p className='fr-text--sm fr-mb-1w'>Périodes attendues sans déclaration</p>
          <p className='fr-h4 fr-mb-0'>{summary.missing ?? 0}</p>
        </div>
        <div className='fr-card fr-card--sm fr-card--grey fr-p-3w'>
          <p className='fr-text--sm fr-mb-1w'>Période affichée</p>
          <p className='fr-h6 fr-mb-0'>{payload?.meta?.from} → {payload?.meta?.to}</p>
        </div>
      </div>

      <Alert
        severity='info'
        title='Lecture de la matrice'
      >
        Une case verte indique qu’au moins une déclaration déposée a produit des données sur le point de prélèvement concerné pour la période. Une case rouge indique qu’une exploitation active sur cette période n’a aucune déclaration trouvée. Les cases grises sont hors période ou inactives.
      </Alert>

      <div className='flex flex-col gap-3'>
        <div className='flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3'>
          <div className='fr-input-group fr-mb-0 max-w-xl'>
            <label className='fr-label' htmlFor='zone-monthly-matrix-search'>Rechercher dans la matrice</label>
            <input
              className='fr-input'
              id='zone-monthly-matrix-search'
              placeholder='Préleveur, point, collecteur, usage…'
              type='search'
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>

          <PeriodControls periodType={periodType} periods={periods} zoneId={zoneId} />
        </div>

        <div className='flex flex-wrap gap-2 items-center'>
          <span className='fr-text--sm fr-mb-0'>Afficher</span>
          {[
            {value: 'ALL', label: 'Toutes'},
            {value: 'MISSING', label: 'À vérifier'},
            {value: 'DECLARED', label: 'Déclarées'}
          ].map(option => (
            <Button
              key={option.value}
              priority={statusFilter === option.value ? 'primary' : 'tertiary no outline'}
              size='small'
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className='flex flex-wrap gap-3 fr-text--sm'>
          <span className='inline-flex items-center gap-1'><span style={{
            display: 'inline-block', width: 14, height: 14, backgroundColor: CELL_STYLES.DECLARED.backgroundColor, border: `1px solid ${CELL_STYLES.DECLARED.borderColor}`
          }} /> Déposée</span>
          <span className='inline-flex items-center gap-1'><span style={{
            display: 'inline-block', width: 14, height: 14, backgroundColor: CELL_STYLES.MISSING.backgroundColor, border: `1px solid ${CELL_STYLES.MISSING.borderColor}`
          }} /> À vérifier</span>
          <span className='inline-flex items-center gap-1'><span style={{
            display: 'inline-block', width: 14, height: 14, backgroundColor: CELL_STYLES.INACTIVE.backgroundColor, border: `1px solid ${CELL_STYLES.INACTIVE.borderColor}`
          }} /> Hors période</span>
        </div>
      </div>

      {flattenedRows.length === 0 && (
        <Alert severity='info'>Aucune exploitation ne correspond à ces filtres.</Alert>
      )}

      {flattenedRows.length > 0 && (
        <Box
          className='border rounded overflow-auto'
          sx={{
            maxHeight: '72vh',
            borderColor: 'var(--border-default-grey)'
          }}
        >
          <table className='w-full border-collapse text-xs'>
            <thead>
              <tr>
                <th
                  className='text-left p-2 sticky top-0 left-0 z-30'
                  style={{backgroundColor: 'var(--background-default-grey)', minWidth: 210, border: '1px solid var(--border-default-grey)'}}
                >
                  Préleveur
                </th>
                <th
                  className='text-left p-2 sticky top-0 z-20'
                  style={{
                    backgroundColor: 'var(--background-default-grey)', minWidth: 230, left: 210, border: '1px solid var(--border-default-grey)'
                  }}
                >
                  Point / exploitation
                </th>
                {periods.map(period => (
                  <th
                    key={period.key}
                    className='p-1 sticky top-0 z-10 text-center whitespace-nowrap'
                    style={{
                      backgroundColor: 'var(--background-default-grey)', minWidth: 22, border: '1px solid var(--border-default-grey)', writingMode: 'vertical-rl', transform: 'rotate(180deg)'
                    }}
                    title={period.fullLabel || period.key}
                  >
                    {period.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flattenedRows.map(({group, row, groupRowIndex, groupSize}) => (
                <tr key={row.exploitationId}>
                  {groupRowIndex === 0 && (
                    <td
                      rowSpan={groupSize}
                      className='align-top p-2 sticky left-0 z-20'
                      style={{backgroundColor: 'var(--background-default-grey)', border: '1px solid var(--border-default-grey)', minWidth: 210}}
                    >
                      <div className='font-bold'>{group.declarantLabel}</div>
                      <div className='fr-text--xs fr-mb-0'>
                        {formatDateTime(group.declarantLastLoginAt)}
                      </div>
                      {group.declarantEmail && <div className='fr-text--xs fr-mb-0'>{group.declarantEmail}</div>}
                    </td>
                  )}

                  <td
                    className='p-2 sticky z-10'
                    style={{
                      backgroundColor: 'var(--background-alt-grey)', left: 210, border: '1px solid var(--border-default-grey)', minWidth: 230
                    }}
                  >
                    <div className='font-medium'>{row.pointName}</div>
                    {row.collecteurs?.length > 0 && (
                      <div className='fr-text--xs fr-mb-0' title={row.collecteurs.map(collecteur => `${collecteur.label} — ${formatDateTime(collecteur.lastLoginAt)}`).join('\n')}>
                        Collecteur : {row.collecteurs.map(c => c.socialReason).join(', ')}
                      </div>
                    )}
                  </td>

                  {row.cells.map(cell => (
                    <MatrixCell key={`${row.exploitationId}-${cell.period || cell.month}`} cell={cell} row={row} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}
    </div>
  )
}

export default ZoneDeclarationMonthlyMatrix
