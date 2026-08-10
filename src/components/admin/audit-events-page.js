'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'

import AdminPageShell from '@/components/admin/admin-page-shell.js'
import DateRangePicker from '@/components/ui/date-range-picker.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {
  PAGE_SIZE_OPTIONS,
  buildAuditSearchParameters,
  getAuditPeriodPresets,
  getParisDateInput,
  isAuditPresetActive
} from '@/lib/audit-events.js'
import {getAuditEventsAction} from '@/server/actions/audit-events.js'

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'Europe/Paris'
})

const OUTCOME_CONFIG = {
  SUCCESS: {label: 'Réussie', badge: 'fr-badge--success', icon: 'ri-checkbox-circle-line'},
  DENIED: {label: 'Refusée', badge: 'fr-badge--warning', icon: 'ri-forbid-line'},
  FAILURE: {label: 'En échec', badge: 'fr-badge--error', icon: 'ri-error-warning-line'},
  STARTED: {label: 'En cours', badge: 'fr-badge--info', icon: 'ri-loader-4-line'},
  INCOMPLETE: {label: 'Interrompue', badge: '', icon: 'ri-pause-circle-line'}
}

const TARGET_LABELS = {
  API_IMPORT: 'Import API',
  CHUNK: 'Ligne de déclaration',
  DATA_EXPORT: 'Export',
  DECLARANT: 'Déclarant',
  DECLARANT_DECLARATION_TYPE: 'Autorisation de déclaration',
  DECLARATION: 'Déclaration',
  DECLARATION_OVERRIDE: 'Exception de période',
  DECLARATION_TYPE: 'Type de déclaration',
  DOCUMENT: 'Document',
  EMAIL_ALIAS: 'Adresse secondaire',
  EXPLOITATION: 'Exploitation',
  NOTIFICATION_RUN: 'Envoi de notifications',
  NOTIFICATION_SETTING: 'Paramètre de notification',
  POINT: 'Point de prélèvement',
  RULE: 'Règle',
  SERVICE_ACCOUNT: 'Compte de service',
  SERVICE_ACCOUNT_CREDENTIAL: 'Identifiant technique',
  SERVICE_ACCOUNT_DECLARANT: 'Autorisation de compte de service',
  SOURCE: 'Fichier source',
  USER: 'Utilisateur',
  ZONE: 'Zone',
  ZONE_MONITORING_STATION: 'Station de suivi'
}

const METADATA_LABELS = {
  changedFields: 'Champs concernés',
  invalidSignedContext: 'Contexte signé invalide',
  loginDomain: 'Domaine de connexion',
  loginFingerprint: 'Empreinte de connexion',
  networkContextSource: 'Origine du contexte réseau',
  previousValues: 'Valeurs précédentes',
  requestedValues: 'Valeurs demandées',
  routeParameters: 'Paramètres de route',
  uploadedFileCount: 'Fichiers déposés',
  uploadedFileExtensions: 'Extensions',
  uploadedFileTotalBytes: 'Taille totale des fichiers'
}

function formatDateTime(value) {
  return value ? DATE_TIME_FORMATTER.format(new Date(value)) : 'Non renseigné'
}

function formatBytes(value) {
  if (!Number.isFinite(Number(value))) {
    return String(value)
  }

  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 1,
    style: 'unit',
    unit: Number(value) >= 1_000_000 ? 'megabyte' : 'kilobyte',
    unitDisplay: 'short'
  }).format(Number(value) / (Number(value) >= 1_000_000 ? 1_000_000 : 1000))
}

function formatMetadataValue(key, value) {
  if (key === 'uploadedFileTotalBytes') {
    return formatBytes(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non'
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([entryKey, entryValue]) => `${entryKey} : ${entryValue}`)
      .join(' · ')
  }

  return String(value ?? 'Non renseigné')
}

function getPageItems(page, totalPages) {
  const candidates = [...new Set([1, totalPages, page - 1, page, page + 1])]
    .filter(candidate => candidate >= 1 && candidate <= totalPages)
    .sort((left, right) => left - right)
  const items = []

  for (const [index, candidate] of candidates.entries()) {
    if (index > 0 && candidate - candidates[index - 1] > 1) {
      items.push(`ellipsis-${candidate}`)
    }

    items.push(candidate)
  }

  return items
}

function updateURL(filters) {
  const parameters = buildAuditSearchParameters(filters)
  const query = parameters.toString()
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}`
  )
}

const Identity = ({email, id, label, sameAccountLabel}) => {
  if (sameAccountLabel) {
    return <span className='text-[var(--text-mention-grey)]'>{sameAccountLabel}</span>
  }

  if (!label && !email && !id) {
    return <span className='text-[var(--text-mention-grey)]'>Non identifié</span>
  }

  return (
    <span className='block min-w-0'>
      <span className='block truncate font-medium text-[var(--text-title-grey)]'>{label || email || id}</span>
      {email && email !== label && (
        <span className='block truncate text-xs text-[var(--text-mention-grey)]'>{email}</span>
      )}
    </span>
  )
}

const OutcomeBadge = ({outcome}) => {
  const config = OUTCOME_CONFIG[outcome] ?? {
    label: outcome,
    badge: '',
    icon: 'ri-question-line'
  }

  return (
    <span className={`fr-badge fr-badge--sm ${config.badge}`}>
      <span className={`${config.icon} mr-1`} aria-hidden='true' />
      {config.label}
    </span>
  )
}

const AuditDetails = ({event}) => {
  const metadataEntries = Object.entries(event.metadata ?? {})

  return (
    <div className='grid gap-5 bg-[var(--background-alt-grey)] px-4 py-4 md:grid-cols-2'>
      <div>
        <h3 className='fr-text--sm fr-mb-2w font-semibold'>Contexte technique</h3>
        <dl className='grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm'>
          <dt className='text-[var(--text-mention-grey)]'>Requête</dt>
          <dd className='min-w-0 break-all'><code>{event.httpMethod} {event.route}</code></dd>
          <dt className='text-[var(--text-mention-grey)]'>Statut HTTP</dt>
          <dd>{event.statusCode ?? 'Non renseigné'}</dd>
          <dt className='text-[var(--text-mention-grey)]'>Request ID</dt>
          <dd className='min-w-0 break-all'><code>{event.requestId}</code></dd>
          {event.originRequestId && event.originRequestId !== event.requestId && (
            <>
              <dt className='text-[var(--text-mention-grey)]'>Corrélation front</dt>
              <dd className='min-w-0 break-all'><code>{event.originRequestId}</code></dd>
            </>
          )}
          <dt className='text-[var(--text-mention-grey)]'>Navigateur</dt>
          <dd className='min-w-0 break-words'>{event.userAgent || 'Non renseigné'}</dd>
          <dt className='text-[var(--text-mention-grey)]'>Fin</dt>
          <dd>{formatDateTime(event.completedAt)}</dd>
        </dl>
      </div>

      <div>
        <h3 className='fr-text--sm fr-mb-2w font-semibold'>Métadonnées autorisées</h3>
        {metadataEntries.length === 0 ? (
          <p className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>Aucune métadonnée complémentaire.</p>
        ) : (
          <dl className='grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm'>
            {metadataEntries.map(([key, value]) => (
              <div key={key} className='contents'>
                <dt className='text-[var(--text-mention-grey)]'>{METADATA_LABELS[key] || key}</dt>
                <dd className='min-w-0 break-words'>{formatMetadataValue(key, value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}

const Pagination = ({filters, onFiltersChange, pagination}) => {
  const pageItems = useMemo(
    () => getPageItems(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages]
  )

  if (pagination.total === 0) {
    return null
  }

  const setPage = page => onFiltersChange(current => ({...current, page}))

  return (
    <div className='flex flex-col gap-3 border-t border-[var(--border-default-grey)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex items-center gap-2'>
        <label className='fr-label fr-mb-0 text-xs' htmlFor='audit-page-size'>Par page</label>
        <select
          className='fr-select h-9 min-h-9 w-20 py-1 text-sm'
          id='audit-page-size'
          value={filters.pageSize}
          onChange={event => onFiltersChange(current => ({
            ...current,
            page: 1,
            pageSize: Number(event.target.value)
          }))}
        >
          {PAGE_SIZE_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      <nav aria-label='Pagination du journal d’audit' className='flex flex-wrap items-center justify-end gap-1'>
        <button
          className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm'
          disabled={pagination.page <= 1}
          type='button'
          onClick={() => setPage(pagination.page - 1)}
        >
          Précédent
        </button>
        {pageItems.map(item => typeof item === 'string' ? (
          <span key={item} className='inline-flex h-8 min-w-8 items-center justify-center text-sm text-gray-500'>…</span>
        ) : (
          <button
            key={item}
            aria-current={item === pagination.page ? 'page' : undefined}
            className={`fr-btn fr-btn--sm ${item === pagination.page ? '' : 'fr-btn--tertiary-no-outline'}`}
            type='button'
            onClick={() => setPage(item)}
          >
            {item}
          </button>
        ))}
        <button
          className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm'
          disabled={pagination.page >= pagination.totalPages}
          type='button'
          onClick={() => setPage(pagination.page + 1)}
        >
          Suivant
        </button>
      </nav>
    </div>
  )
}

const AuditEventsPage = ({
  initialData,
  initialError,
  initialFilters,
  options
}) => {
  const requestIdRef = useRef(0)
  const firstRenderRef = useRef(true)
  const today = useMemo(() => getParisDateInput(), [])
  const presets = useMemo(() => getAuditPeriodPresets(today), [today])
  const [filters, setFilters] = useState(initialFilters)
  const [data, setData] = useState(initialData)
  const [error, setError] = useState(initialError)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedEventId, setExpandedEventId] = useState(null)

  const updateFilters = updater => {
    setFilters(current => {
      const next = typeof updater === 'function' ? updater(current) : updater
      updateURL(next)
      return next
    })
  }

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return undefined
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getAuditEventsAction(filters)

        if (requestIdRef.current !== requestId) {
          return
        }

        if (!result.success) {
          setError(result.error || 'Impossible de charger le journal d’audit.')
          return
        }

        setData(result.data?.data)
        setExpandedEventId(null)
      } catch {
        if (requestIdRef.current === requestId) {
          setError('Impossible de charger le journal d’audit.')
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false)
        }
      }
    }, filters.actor || filters.subject ? 300 : 0)

    return () => window.clearTimeout(timeoutId)
  }, [filters])

  const actionOptions = useMemo(() => (options?.actionGroups ?? []).map(group => ({
    label: group.label,
    options: group.actions.map(action => ({
      value: action.value,
      content: action.label,
      label: action.label
    }))
  })), [options])
  const outcomeOptions = useMemo(() => [{
    label: 'Résultat',
    options: (options?.outcomes ?? []).map(outcome => ({
      value: outcome.value,
      content: outcome.label,
      label: outcome.label
    }))
  }], [options])
  const pagination = data?.pagination ?? {
    page: filters.page,
    pageSize: filters.pageSize,
    total: 0,
    totalPages: 1
  }
  const displayedPeriod = filters.period && data?.period
    ? {from: data.period.from, to: data.period.to}
    : filters
  const firstItem = pagination.total === 0
    ? 0
    : ((pagination.page - 1) * pagination.pageSize) + 1
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.total)
  let resultCountLabel = `${firstItem}-${lastItem} sur ${pagination.total} action${pagination.total > 1 ? 's' : ''}`

  if (pagination.total === 0) {
    resultCountLabel = 'Aucune action trouvée'
  }

  if (isLoading) {
    resultCountLabel = 'Actualisation…'
  }

  return (
    <AdminPageShell
      description='Retrouvez les opérations sensibles, les accès aux fichiers et les tentatives refusées sur la plateforme.'
      title='Journal d’audit'
    >
      <section className='mb-5 border border-[var(--border-default-grey)] bg-white p-4 md:p-5' aria-labelledby='audit-filters-title'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
          <h2 id='audit-filters-title' className='fr-h5 fr-mb-0'>Rechercher une action</h2>
          <button
            className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm'
            type='button'
            onClick={() => {
              const defaultPreset = presets.find(preset => preset.key === '30d')
              updateFilters({
                ...initialFilters,
                actor: '',
                subject: '',
                actionTypes: [],
                outcomes: [],
                from: defaultPreset.from,
                to: defaultPreset.to,
                period: '',
                page: 1
              })
            }}
          >
            Réinitialiser
          </button>
        </div>

        <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-4'>
          <div className='fr-input-group fr-mb-0'>
            <label className='fr-label' htmlFor='audit-actor'>Auteur</label>
            <input
              className='fr-input'
              id='audit-actor'
              placeholder='Nom, email ou identifiant'
              type='search'
              value={filters.actor}
              onChange={event => updateFilters(current => ({
                ...current,
                actor: event.target.value,
                page: 1
              }))}
            />
          </div>

          <div className='fr-input-group fr-mb-0'>
            <label className='fr-label' htmlFor='audit-subject'>Compte concerné</label>
            <input
              className='fr-input'
              id='audit-subject'
              placeholder='Nom, email ou identifiant'
              type='search'
              value={filters.subject}
              onChange={event => updateFilters(current => ({
                ...current,
                subject: event.target.value,
                page: 1
              }))}
            />
          </div>

          <GroupedMultiselect
            searchable
            id='audit-actions'
            label='Type d’action'
            options={actionOptions}
            placeholder='Tous les types'
            value={filters.actionTypes}
            onChange={actionTypes => updateFilters(current => ({
              ...current,
              actionTypes,
              page: 1
            }))}
          />

          <GroupedMultiselect
            id='audit-outcomes'
            label='Résultat'
            options={outcomeOptions}
            placeholder='Tous les résultats'
            value={filters.outcomes}
            onChange={outcomes => updateFilters(current => ({
              ...current,
              outcomes,
              page: 1
            }))}
          />
        </div>

        <div className='mt-4 flex flex-col gap-3 border-t border-[var(--border-default-grey)] pt-4 xl:flex-row xl:items-end xl:justify-between'>
          <DateRangePicker
            endDate={displayedPeriod.to}
            id='audit-date-range'
            label='Période'
            maxDate={today}
            presets={[]}
            startDate={displayedPeriod.from}
            onChange={({startDate, endDate}) => updateFilters(current => ({
              ...current,
              from: startDate,
              to: endDate,
              period: '',
              page: 1
            }))}
          />
          <div>
            <p className='fr-text--xs fr-mb-1v text-[var(--text-mention-grey)]'>Périodes rapides</p>
            <div className='flex flex-wrap gap-1.5'>
              {presets.map(preset => {
                const active = isAuditPresetActive(preset, filters)

                return (
                  <button
                    key={preset.key}
                    aria-pressed={active}
                    className={`fr-btn fr-btn--sm ${active ? '' : 'fr-btn--secondary'}`}
                    type='button'
                    onClick={() => updateFilters(current => ({
                      ...current,
                      from: preset.from ?? current.from,
                      to: preset.to ?? current.to,
                      period: preset.period ?? '',
                      page: 1
                    }))}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <Alert
          className='fr-mb-3w'
          description={error}
          severity='error'
          title='Journal indisponible'
        />
      )}

      <section className='border border-[var(--border-default-grey)] bg-white' aria-busy={isLoading}>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default-grey)] px-4 py-3'>
          <p className='fr-text--sm fr-mb-0 font-medium' aria-live='polite'>
            {resultCountLabel}
          </p>
          <p className='fr-text--xs fr-mb-0 text-[var(--text-mention-grey)]'>Conservation : 24 mois</p>
        </div>

        {(data?.items ?? []).length === 0 ? (
          <div className='px-4 py-12 text-center'>
            <span className='ri-shield-check-line mb-2 block text-3xl text-[var(--text-mention-grey)]' aria-hidden='true' />
            <p className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>Aucune action ne correspond à ces filtres.</p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-55' : ''}`}>
            <table className='w-full min-w-[1120px] border-collapse text-left text-sm'>
              <thead className='bg-[var(--background-alt-grey)] text-xs text-[var(--text-mention-grey)]'>
                <tr>
                  <th className='px-4 py-3 font-medium' scope='col'>Date</th>
                  <th className='px-4 py-3 font-medium' scope='col'>Action</th>
                  <th className='px-4 py-3 font-medium' scope='col'>Auteur</th>
                  <th className='px-4 py-3 font-medium' scope='col'>Compte concerné</th>
                  <th className='px-4 py-3 font-medium' scope='col'>Cible</th>
                  <th className='px-4 py-3 font-medium' scope='col'>Résultat</th>
                  <th className='px-4 py-3 font-medium' scope='col'>IP</th>
                  <th className='w-12 px-2 py-3' scope='col'><span className='sr-only'>Détail</span></th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[var(--border-default-grey)]'>
                {data.items.map(event => {
                  const expanded = expandedEventId === event.id
                  const concernedId = event.subjectUserId || event.effectiveUserId
                  const concernedLabel = event.subjectUserLabel || event.effectiveUserLabel
                  const concernedEmail = event.subjectUserEmail || event.effectiveUserEmail
                  const sameAsActor = event.actorUserId && concernedId === event.actorUserId

                  return (
                    <tr key={event.id} className='group align-top hover:bg-[var(--background-alt-blue-france)]'>
                      <td className='whitespace-nowrap px-4 py-3'>{formatDateTime(event.occurredAt)}</td>
                      <td className='max-w-[260px] px-4 py-3'>
                        <span className='block font-medium'>{event.actionLabel}</span>
                        <span className='block text-xs text-[var(--text-mention-grey)]'>{event.categoryLabel}</span>
                      </td>
                      <td className='max-w-[220px] px-4 py-3'>
                        <Identity
                          email={event.actorEmail}
                          id={event.actorUserId || event.actorServiceAccountId}
                          label={event.actorLabel || (event.actorType === 'ANONYMOUS' ? 'Anonyme' : null)}
                        />
                      </td>
                      <td className='max-w-[220px] px-4 py-3'>
                        <Identity
                          email={concernedEmail}
                          id={concernedId}
                          label={concernedLabel}
                          sameAccountLabel={sameAsActor ? 'Même compte' : null}
                        />
                      </td>
                      <td className='max-w-[220px] px-4 py-3'>
                        {event.targetType ? (
                          <span className='block min-w-0'>
                            <span className='block'>{TARGET_LABELS[event.targetType] || event.targetType}</span>
                            {(event.targetLabel || event.targetId) && (
                              <span className='block truncate text-xs text-[var(--text-mention-grey)]'>{event.targetLabel || event.targetId}</span>
                            )}
                          </span>
                        ) : <span className='text-[var(--text-mention-grey)]'>—</span>}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3'><OutcomeBadge outcome={event.outcome} /></td>
                      <td className='max-w-[180px] break-all px-4 py-3 font-mono text-xs'>{event.clientIp || '—'}</td>
                      <td className='px-2 py-2 text-right'>
                        <button
                          aria-expanded={expanded}
                          aria-label={expanded ? 'Masquer le détail' : 'Afficher le détail'}
                          className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-only'
                          title={expanded ? 'Masquer le détail' : 'Afficher le détail'}
                          type='button'
                          onClick={() => setExpandedEventId(expanded ? null : event.id)}
                        >
                          <span className={expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} aria-hidden='true' />
                        </button>
                      </td>
                    </tr>
                  )
                }).flatMap((row, index) => {
                  const event = data.items[index]
                  const expanded = expandedEventId === event.id

                  return expanded
                    ? [row, (
                      <tr key={`${event.id}-details`}>
                        <td className='p-0' colSpan='8'><AuditDetails event={event} /></td>
                      </tr>
                    )]
                    : [row]
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          filters={filters}
          pagination={pagination}
          onFiltersChange={updateFilters}
        />
      </section>
    </AdminPageShell>
  )
}

export default AuditEventsPage
