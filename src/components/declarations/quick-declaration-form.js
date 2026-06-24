'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'

import QuickDeclarationMap from './quick-declaration-map.js'

import {useAuth} from '@/contexts/auth-context.js'
import {getDeclarantTitleFromUser} from '@/lib/declarants.js'
import {getMyDeclarationURL} from '@/lib/urls.js'
import {
  createQuickDeclarationAction,
  getQuickDeclarationContextAction
} from '@/server/actions/declarations.js'
import {formatNumber} from '@/utils/number.js'

const USAGE_LABELS = {
  INCONNU: 'Inconnu',
  PAS_D_USAGE: 'Pas d’usage',
  IRRIGATION: 'Irrigation',
  AGRICULTURE_ELEVAGE: 'Agriculture / élevage',
  AQUACULTURE: 'Aquaculture',
  INDUSTRIE: 'Industrie',
  AEP: 'AEP',
  ENERGIE: 'Énergie',
  LOISIRS: 'Loisirs',
  EMBOUTEILLAGE: 'Embouteillage',
  THERMALISME_THALASSO: 'Thermalisme / thalasso',
  DEFENSE_INCENDIE: 'Défense incendie',
  REALIMENTATION_EAU: 'Réalimentation en eau',
  CANAUX: 'Canaux',
  ETIAGE: 'Étiage',
  ENTRETIEN_VOIRIES: 'Entretien voiries',
  ALIMENTATION_SOUTIEN_CANAL: 'Alimentation / soutien de canal',
  DOMESTIQUE: 'Domestique'
}

const POINTS_CONTACT_EMAIL = 'contact@partageonsleau.beta.gouv.fr'
const POINTS_CONTACT_SUBJECT_SUFFIX = 'Modification sur mes points de prélèvements'
const FALLBACK_USAGE_OPTIONS = Object.keys(USAGE_LABELS)
const ENTRY_GRID_COLUMNS_CLASS_NAME = 'md:grid-cols-[minmax(150px,1fr)_128px_180px]'

function getPreleveurId(preleveur) {
  return preleveur.id || preleveur.userId || preleveur.declarant?.userId
}

function getPointId(point) {
  return point.pointPrelevementId || point.id
}

function getDeclarantContactName(declarant) {
  const firstName = declarant?.firstName ?? declarant?.user?.firstName
  const lastName = declarant?.lastName ?? declarant?.user?.lastName

  if (firstName || lastName) {
    return [lastName, firstName].filter(Boolean).join(' / ')
  }

  const title = getDeclarantTitleFromUser(declarant)
  return declarant?.socialReason || declarant?.declarant?.socialReason || (title === 'Non renseigné' ? '' : title)
}

function buildPointsContactMailto(declarantName) {
  const subject = `[${declarantName || 'Nom / prénom du déclarant'}] ${POINTS_CONTACT_SUBJECT_SUFFIX}`
  return `mailto:${POINTS_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
}

function normalizePointId(pointId) {
  if (pointId === null || pointId === undefined) {
    return null
  }

  return String(pointId)
}

function isPointIdEqual(pointId, otherPointId) {
  return normalizePointId(pointId) === normalizePointId(otherPointId)
}

function todayISO() {
  const today = new Date()
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
  return today.toISOString().slice(0, 10)
}

function isFutureDate(value, maxDate) {
  return Boolean(value && maxDate && value > maxDate)
}

function formatDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('fr-FR').format(date)
}

function formatUsage(value) {
  return USAGE_LABELS[value] || String(value || '').replaceAll('_', ' ').toLowerCase()
}

function classNames(...values) {
  return values.filter(Boolean).join(' ')
}

function getPointName(point) {
  return point.name || 'Point de prélèvement'
}

function hasDeclarationHistory(point) {
  const declarationsCount = Number(point.declarationsCount ?? point.declarationCount ?? 0)
  return Boolean(point.lastReading || point.lastDeclaration || declarationsCount > 0)
}

function comparePointsForEntry(pointA, pointB) {
  const historyOrder = Number(hasDeclarationHistory(pointB)) - Number(hasDeclarationHistory(pointA))

  if (historyOrder !== 0) {
    return historyOrder
  }

  return getPointName(pointA).localeCompare(getPointName(pointB), 'fr', {sensitivity: 'base'})
}

function normalizeNumberInput(value) {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  const compactValue = String(value)
    .replaceAll(/\s/g, '')
    .replaceAll(',', '.')
    .replaceAll(/[^\d.]/g, '')

  if (!compactValue) {
    return ''
  }

  const hasDecimalSeparator = compactValue.includes('.')
  const [integerPart = '', ...fractionParts] = compactValue.split('.')
  const integer = integerPart.replace(/^0+(?=\d)/, '')
  const fraction = fractionParts.join('')

  if (!hasDecimalSeparator) {
    return integer
  }

  return `${integer || '0'}.${fraction}`
}

function formatIndexInput(value) {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  const normalizedValue = String(value)
  const [integerPart = '0', fractionPart = ''] = normalizedValue.split('.')
  const groupedInteger = (integerPart || '0').replaceAll(/\B(?=(\d{3})+(?!\d))/g, ' ')

  if (!normalizedValue.includes('.')) {
    return groupedInteger
  }

  return `${groupedInteger},${fractionPart}`
}

function countEditableNumberCharacters(value, endIndex) {
  let count = 0

  for (const character of String(value).slice(0, endIndex)) {
    if (/[\d,.]/.test(character)) {
      count += 1
    }
  }

  return count
}

function getFormattedCaretPosition(value, editableCharactersCount) {
  if (editableCharactersCount <= 0) {
    return 0
  }

  let count = 0

  for (const [index, character] of [...value].entries()) {
    if (/[\d,]/.test(character)) {
      count += 1

      if (count >= editableCharactersCount) {
        return index + 1
      }
    }
  }

  return value.length
}

function isCompleteNumberInput(value) {
  return value !== '' && !String(value).endsWith('.')
}

function getDefaultUsage(point) {
  return point.lastKnownUsage || point.usages?.find(Boolean) || ''
}

function getInitialRow(point) {
  return {
    index: '',
    usage: getDefaultUsage(point)
  }
}

function getRowState(rows, pointId) {
  return rows[pointId] ?? {index: '', usage: ''}
}

function getLastReadingLabel(point) {
  const {lastReading} = point

  if (!lastReading || lastReading.value === null || lastReading.value === undefined) {
    return null
  }

  const date = formatDate(lastReading.date)
  const unit = lastReading.unit || 'm³'

  return `${formatNumber(lastReading.value)} ${unit}${date ? ` au ${date}` : ''}`
}

function getWarning({point, row, readingDate}) {
  if (!point?.lastReading || row.index === '' || !readingDate) {
    return null
  }

  const value = Number(row.index)
  const previousValue = Number(point.lastReading.value)

  if (!Number.isFinite(value) || !Number.isFinite(previousValue)) {
    return null
  }

  const readingTime = Date.parse(`${readingDate}T00:00:00.000Z`)
  const previousTime = Date.parse(point.lastReading.date)

  if (!Number.isFinite(readingTime) || !Number.isFinite(previousTime)) {
    return null
  }

  if (readingTime >= previousTime && value < previousValue) {
    return `⚠ inférieur au dernier index (${formatNumber(previousValue)} m³ au ${formatDate(point.lastReading.date)})`
  }

  if (readingTime < previousTime && value > previousValue) {
    return `⚠ date antérieure au dernier index (${formatNumber(previousValue)} m³ au ${formatDate(point.lastReading.date)})`
  }

  return null
}

function buildUsageOptionsForPoint(point, globalUsageOptions) {
  return [
    ...new Set([
      point.lastKnownUsage,
      ...(point.usages ?? []),
      ...globalUsageOptions
    ].filter(Boolean))
  ]
}

function getInitialPreleveurId(availablePreleveurs) {
  if (availablePreleveurs.length === 1) {
    return getPreleveurId(availablePreleveurs[0])
  }

  return ''
}

function isQuickDeclarationEnabledForCurrentDeclarant({
  declarantRole,
  quickDeclarationEnabled,
  selectedPreleveur
}) {
  if (quickDeclarationEnabled === false) {
    return false
  }

  if (declarantRole !== 'COLLECTEUR') {
    return true
  }

  return selectedPreleveur?.quickDeclarationEnabled !== false
}

function getTargetDeclarantUserId(shouldSelectPreleveur, selectedPreleveurId) {
  return shouldSelectPreleveur ? selectedPreleveurId : undefined
}

function canSubmitQuickDeclaration({
  context,
  entries,
  isContextLoading,
  isSubmitting,
  validationErrors
}) {
  return !isSubmitting
    && !isContextLoading
    && Boolean(context)
    && entries.length > 0
    && validationErrors.length === 0
}

function getSubmitButtonLabel(isSubmitting, entriesCount) {
  if (isSubmitting) {
    return 'Soumission…'
  }

  if (entriesCount > 0) {
    return `Soumettre ${entriesCount} relevé${entriesCount > 1 ? 's' : ''}`
  }

  return 'Soumettre'
}

function getQuickDeclarationUnavailableAlertProps({
  availablePreleveurs,
  canCreateQuickDeclaration,
  declarantRole,
  quickDeclarationEnabled
}) {
  if (declarantRole === 'COLLECTEUR' && availablePreleveurs.length === 0) {
    return {
      severity: 'info',
      title: 'Aucun déclarant accessible',
      description: 'Votre compte collecteur n’est rattaché à aucune exploitation.'
    }
  }

  if (!canCreateQuickDeclaration || quickDeclarationEnabled === false) {
    return {
      severity: 'info',
      title: 'Saisie rapide désactivée',
      description: 'La saisie rapide n’est pas activée pour votre compte. Vous pouvez continuer à déposer un fichier.'
    }
  }

  return null
}

function getEntryRowClassName({hasHistory, hasIndex, isHighlighted}) {
  return classNames(
    'grid grid-cols-1 gap-2 border-b border-r border-l-4 px-2 py-2 transition md:items-start',
    'border-b-gray-200 border-r-gray-200',
    ENTRY_GRID_COLUMNS_CLASS_NAME,
    hasIndex && 'border-l-green-600 bg-green-50 shadow-sm',
    !hasIndex && isHighlighted && 'border-l-blue-500 bg-blue-50',
    !hasIndex && !isHighlighted && hasHistory && 'border-l-gray-400 bg-gray-50 hover:bg-gray-100',
    !hasIndex && !isHighlighted && !hasHistory && 'border-l-transparent bg-white hover:bg-gray-50'
  )
}

const QuickDeclarationToolbar = ({
  availablePreleveurs,
  context,
  maxReadingDate,
  onPreleveurChange,
  pointsCount,
  readingDate,
  selectedPreleveurId,
  setReadingDate,
  shouldSelectPreleveur
}) => (
  <div className='fr-mb-2w flex flex-col gap-2 md:flex-row md:items-end md:justify-between'>
    <div className='min-w-0'>
      {context && pointsCount > 0 && (
        <div className='flex flex-wrap items-center gap-2'>
          <p className='fr-hint-text fr-mb-0'>
            {pointsCount} point{pointsCount > 1 ? 's' : ''}. Seules les lignes avec un index seront déposées.
          </p>
        </div>
      )}
    </div>

    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:items-end'>
      {shouldSelectPreleveur && (
        <div className='fr-select-group fr-mb-0 min-w-[220px]'>
          <label className='fr-label' htmlFor='quick-preleveur'>Déclarant</label>
          <select
            id='quick-preleveur'
            className='fr-select'
            value={selectedPreleveurId}
            onChange={event => onPreleveurChange(event.target.value)}
          >
            <option value=''>Sélectionner un déclarant</option>
            {availablePreleveurs.map(preleveur => (
              <option key={getPreleveurId(preleveur)} value={getPreleveurId(preleveur)}>
                {getDeclarantTitleFromUser(preleveur)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className='fr-input-group fr-mb-0 min-w-[180px]'>
        <label className='fr-label' htmlFor='quick-reading-date'>Date de relevé</label>
        <input
          id='quick-reading-date'
          className='fr-input'
          type='date'
          value={readingDate}
          max={maxReadingDate}
          onChange={event => setReadingDate(event.target.value)}
        />
      </div>
    </div>
  </div>
)

const QuickDeclarationStatusAlerts = ({
  context,
  contextError,
  isContextLoading,
  pointsCount,
  selectedPreleveur,
  selectedPreleveurId,
  shouldSelectPreleveur
}) => (
  <>
    {isContextLoading && (
      <Alert
        className='fr-mb-2w'
        severity='info'
        title='Chargement des points'
        description='Récupération des points de prélèvement.'
      />
    )}

    {contextError && (
      <Alert
        className='fr-mb-2w'
        severity='error'
        title='Saisie rapide indisponible'
        description={contextError}
      />
    )}

    {shouldSelectPreleveur && !selectedPreleveurId && (
      <Alert
        className='fr-mb-2w'
        severity='info'
        title='Sélectionnez un déclarant'
        description='La liste des points et la carte s’afficheront ensuite.'
      />
    )}

    {shouldSelectPreleveur && selectedPreleveur && selectedPreleveur.quickDeclarationEnabled === false && (
      <Alert
        className='fr-mb-2w'
        severity='info'
        title='Saisie rapide désactivée pour ce déclarant'
        description='Sélectionnez un autre déclarant ou déposez un fichier.'
      />
    )}

    {context && pointsCount === 0 && (
      <Alert
        className='fr-mb-2w'
        severity='info'
        title='Aucun point à déclarer'
        description='Aucun point de prélèvement actif n’est rattaché à ce déclarant.'
      />
    )}
  </>
)

const UnsavedPreleveurChangeModal = ({
  close,
  confirm,
  open
}) => {
  if (!open) {
    return null
  }

  return (
    <div className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4' role='presentation'>
      <div
        aria-labelledby='quick-declaration-change-preleveur-title'
        aria-modal='true'
        className='w-full max-w-lg bg-white p-6 shadow-lg'
        role='dialog'
      >
        <h2 id='quick-declaration-change-preleveur-title' className='fr-h4 fr-mb-2w'>
          Changer de déclarant ?
        </h2>
        <p className='fr-text--sm fr-mb-4w'>
          Les index saisis ne seront pas conservés si vous sélectionnez un autre déclarant.
        </p>
        <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <button className='fr-btn fr-btn--secondary' type='button' onClick={close}>
            Continuer la saisie
          </button>
          <button className='fr-btn' type='button' onClick={confirm}>
            Changer de déclarant
          </button>
        </div>
      </div>
    </div>
  )
}

const QuickDeclarationEntryRow = ({
  activePointId,
  focusNextPoint,
  focusPoint,
  globalUsageOptions,
  handleIndexChange,
  hoveredPointId,
  inputRefs,
  point,
  readingDate,
  row,
  setActivePointId,
  setHoveredPointId,
  updateRow
}) => {
  const pointId = getPointId(point)
  const hasIndex = row.index !== ''
  const hasHistory = hasDeclarationHistory(point)
  const warning = getWarning({point, row, readingDate})
  const lastReadingLabel = getLastReadingLabel(point)
  const isHighlighted = isPointIdEqual(pointId, hoveredPointId) || isPointIdEqual(pointId, activePointId)
  const usageOptions = buildUsageOptionsForPoint(point, globalUsageOptions)
  const pointName = getPointName(point)

  return (
    <div
      key={pointId}
      role='listitem'
      className={getEntryRowClassName({hasHistory, hasIndex, isHighlighted})}
      onMouseEnter={() => setHoveredPointId(pointId)}
      onMouseLeave={() => setHoveredPointId(null)}
    >
      <div className='min-w-0 md:pt-2'>
        <button
          type='button'
          className={classNames(
            'fr-link block max-w-full truncate text-left text-sm',
            hasIndex ? 'font-bold' : 'font-medium'
          )}
          title={pointName}
          onClick={() => focusPoint(pointId)}
        >
          {pointName}
        </button>
        {lastReadingLabel && (
          <p className='fr-hint-text fr-mb-0 mt-1 text-[0.72rem] leading-tight'>
            Dernier index : {lastReadingLabel}
          </p>
        )}
      </div>

      <div className='fr-input-group fr-mb-0'>
        <label className='fr-label md:hidden' htmlFor={`quick-index-${pointId}`}>Index</label>
        <div className='quick-declaration-field relative mt-1 md:mt-0'>
          <input
            ref={node => {
              if (node) {
                inputRefs.current[pointId] = node
              } else {
                delete inputRefs.current[pointId]
              }
            }}
            id={`quick-index-${pointId}`}
            className={classNames(
              'fr-input quick-declaration-control pr-9 text-right text-sm font-semibold tabular-nums',
              hasIndex && 'bg-white'
            )}
            type='text'
            inputMode='decimal'
            value={formatIndexInput(row.index)}
            placeholder='0'
            onFocus={() => setActivePointId(pointId)}
            onChange={event => handleIndexChange(pointId, event)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                focusNextPoint(pointId)
              }
            }}
          />
          <span
            className={classNames(
              'pointer-events-none absolute inset-y-0 right-2 flex items-center',
              'text-xs font-bold text-gray-600'
            )}
          >
            m³
          </span>
        </div>
        {warning && (
          <p className='fr-hint-text fr-mb-0 mt-2 text-[0.72rem] leading-tight text-orange-700'>
            {warning}
          </p>
        )}
      </div>

      <div className='fr-select-group fr-mb-0'>
        <label className='fr-label md:hidden' htmlFor={`quick-usage-${pointId}`}>Usage</label>
        <div className='quick-declaration-field mt-1 md:mt-0'>
          <select
            id={`quick-usage-${pointId}`}
            className='fr-select quick-declaration-control text-sm'
            value={row.usage}
            onFocus={() => setActivePointId(pointId)}
            onChange={event => updateRow(pointId, {usage: event.target.value})}
          >
            <option value=''>Usage</option>
            {usageOptions.map(usage => (
              <option key={usage} value={usage}>{formatUsage(usage)}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

const QuickDeclarationEntryList = ({
  activePointId,
  entryPoints,
  focusNextPoint,
  focusPoint,
  globalUsageOptions,
  handleIndexChange,
  hoveredPointId,
  inputRefs,
  readingDate,
  rows,
  setActivePointId,
  setHoveredPointId,
  updateRow
}) => (
  <div className='xl:max-h-[calc(100vh-18rem)] xl:overflow-auto'>
    <div
      className={classNames(
        'hidden sticky top-0 z-10 gap-2 border-b bg-white px-2 py-1 text-xs font-bold text-gray-600 md:grid',
        ENTRY_GRID_COLUMNS_CLASS_NAME
      )}
    >
      <div>Point de prélèvement</div>
      <div>Index</div>
      <div>Usage</div>
    </div>

    <div role='list' className='border-t border-gray-200 md:border-t-0'>
      {entryPoints.map(point => {
        const pointId = getPointId(point)

        return (
          <QuickDeclarationEntryRow
            key={pointId}
            activePointId={activePointId}
            focusNextPoint={focusNextPoint}
            focusPoint={focusPoint}
            globalUsageOptions={globalUsageOptions}
            handleIndexChange={handleIndexChange}
            hoveredPointId={hoveredPointId}
            inputRefs={inputRefs}
            point={point}
            readingDate={readingDate}
            row={getRowState(rows, pointId)}
            setActivePointId={setActivePointId}
            setHoveredPointId={setHoveredPointId}
            updateRow={updateRow}
          />
        )
      })}
    </div>
  </div>
)

const QuickDeclarationSubmission = ({
  canSubmit,
  entries,
  hasAnyIndex,
  submit,
  submitButtonLabel,
  submitResult,
  validationErrors
}) => (
  <>
    {validationErrors.length > 0 && hasAnyIndex && (
      <Alert
        className='fr-mb-2w'
        severity='error'
        title='Saisie incomplète'
        description={validationErrors[0]}
      />
    )}

    <div className='fr-mt-2w flex flex-col gap-2 md:flex-row md:items-center'>
      <Button priority='primary' disabled={!canSubmit} onClick={submit}>
        {submitButtonLabel}
      </Button>
      {entries.length === 0 && (
        <p className='fr-hint-text fr-mb-0'>Saisissez au moins un index pour soumettre.</p>
      )}
    </div>

    {submitResult?.status === 'success' && (
      <Alert
        className='fr-mt-2w'
        severity='success'
        title='Déclaration créée'
        description={submitResult.message}
      />
    )}

    {submitResult?.status === 'error' && (
      <Alert
        className='fr-mt-2w'
        severity='error'
        title='Soumission impossible'
        description={submitResult.message}
      />
    )}
  </>
)

const QuickDeclarationEntriesPanel = ({
  activePointId,
  canSubmit,
  comment,
  context,
  entries,
  entryPoints,
  focusNextPoint,
  focusPoint,
  globalUsageOptions,
  handleIndexChange,
  hasAnyIndex,
  hoveredPointId,
  inputRefs,
  pointsCount,
  readingDate,
  rows,
  setActivePointId,
  setComment,
  setHoveredPointId,
  submit,
  submitButtonLabel,
  submitResult,
  updateRow,
  validationErrors
}) => {
  if (!context || pointsCount === 0) {
    return null
  }

  return (
    <>
      <QuickDeclarationEntryList
        activePointId={activePointId}
        entryPoints={entryPoints}
        focusNextPoint={focusNextPoint}
        focusPoint={focusPoint}
        globalUsageOptions={globalUsageOptions}
        handleIndexChange={handleIndexChange}
        hoveredPointId={hoveredPointId}
        inputRefs={inputRefs}
        readingDate={readingDate}
        rows={rows}
        setActivePointId={setActivePointId}
        setHoveredPointId={setHoveredPointId}
        updateRow={updateRow}
      />

      <div className='fr-input-group fr-mt-2w fr-mb-2w'>
        <label className='fr-label' htmlFor='quick-comment'>Commentaire facultatif</label>
        <textarea
          id='quick-comment'
          className='fr-input'
          rows={2}
          value={comment}
          onChange={event => setComment(event.target.value)}
        />
      </div>

      <QuickDeclarationSubmission
        canSubmit={canSubmit}
        entries={entries}
        hasAnyIndex={hasAnyIndex}
        submit={submit}
        submitButtonLabel={submitButtonLabel}
        submitResult={submitResult}
        validationErrors={validationErrors}
      />
    </>
  )
}

const QuickDeclarationMapPanel = ({
  activePointId,
  context,
  declaredPointIds,
  declarantName,
  entryPoints,
  focusPoint,
  hoveredPointId,
  pointsCount,
  selectedPointIds,
  setHoveredPointId
}) => {
  if (!context || pointsCount === 0) {
    return null
  }

  const pointsContactMailto = buildPointsContactMailto(declarantName)

  return (
    <aside className='order-1 xl:order-2 xl:sticky xl:top-3'>
      <div className='fr-mb-1v text-center'>
        <a
          className='fr-link text-xs'
          href={pointsContactMailto}
          rel='noreferrer'
          target='_blank'
        >
          Signaler une modification sur mes points
        </a>
      </div>
      <div className='h-[220px] sm:h-[260px] xl:h-[calc(100vh-8rem)]'>
        <QuickDeclarationMap
          points={entryPoints}
          activePointId={activePointId}
          hoveredPointId={hoveredPointId}
          selectedPointIds={selectedPointIds}
          declaredPointIds={declaredPointIds}
          onHoverPoint={setHoveredPointId}
          onFocusPoint={focusPoint}
        />
      </div>
    </aside>
  )
}

const QuickDeclarationForm = ({
  availablePreleveurs = [],
  declarantRole,
  quickDeclarationEnabled = true,
  canCreateQuickDeclaration = true,
  onDirtyChange
}) => {
  const {user} = useAuth()
  const initialPreleveurId = getInitialPreleveurId(availablePreleveurs)
  const [selectedPreleveurId, setSelectedPreleveurId] = useState(initialPreleveurId)
  const [context, setContext] = useState(null)
  const [contextError, setContextError] = useState(null)
  const [isContextLoading, setIsContextLoading] = useState(false)
  const [readingDate, setReadingDate] = useState(todayISO())
  const [comment, setComment] = useState('')
  const [rows, setRows] = useState({})
  const [activePointId, setActivePointId] = useState(null)
  const [hoveredPointId, setHoveredPointId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)
  const [pendingPreleveurId, setPendingPreleveurId] = useState(null)
  const [preleveurChangeModalOpen, setPreleveurChangeModalOpen] = useState(false)
  const inputRefs = useRef({})
  const maxReadingDate = useMemo(todayISO, [])

  const selectedPreleveur = useMemo(
    () => availablePreleveurs.find(preleveur => getPreleveurId(preleveur) === selectedPreleveurId) ?? null,
    [availablePreleveurs, selectedPreleveurId]
  )

  const shouldSelectPreleveur = declarantRole === 'COLLECTEUR'
  const quickEnabledForCurrentDeclarant = isQuickDeclarationEnabledForCurrentDeclarant({
    declarantRole,
    quickDeclarationEnabled,
    selectedPreleveur
  })
  const targetDeclarantUserId = getTargetDeclarantUserId(shouldSelectPreleveur, selectedPreleveurId)
  const contactDeclarantName = useMemo(
    () => getDeclarantContactName(shouldSelectPreleveur ? selectedPreleveur : user),
    [selectedPreleveur, shouldSelectPreleveur, user]
  )

  const points = useMemo(() => context?.points ?? [], [context?.points])
  const entryPoints = useMemo(
    () => [...points].sort(comparePointsForEntry),
    [points]
  )
  const globalUsageOptions = useMemo(
    () => (context?.usageOptions?.length > 0 ? context.usageOptions : FALLBACK_USAGE_OPTIONS),
    [context?.usageOptions]
  )
  const pointsCount = points.length
  const selectedPointIds = useMemo(
    () => Object.entries(rows)
      .filter(([, row]) => row.index !== '')
      .map(([pointId]) => pointId),
    [rows]
  )
  const declaredPointIds = useMemo(
    () => points
      .filter(point => hasDeclarationHistory(point))
      .map(point => getPointId(point)),
    [points]
  )

  useEffect(() => {
    let ignore = false

    const loadContext = async () => {
      setContext(null)
      setContextError(null)
      setSubmitResult(null)
      setActivePointId(null)
      setHoveredPointId(null)

      if (shouldSelectPreleveur && !selectedPreleveurId) {
        return
      }

      if (!canCreateQuickDeclaration || !quickEnabledForCurrentDeclarant) {
        return
      }

      setIsContextLoading(true)

      try {
        const result = await getQuickDeclarationContextAction({declarantUserId: targetDeclarantUserId})

        if (ignore) {
          return
        }

        if (!result?.success || !result.data?.success) {
          throw new Error(result?.error || result?.data?.message || 'Impossible de charger la saisie rapide.')
        }

        const payload = result.data.data

        setContext(payload)
        setRows(previous => Object.fromEntries((payload.points ?? []).map(point => {
          const pointId = getPointId(point)
          return [pointId, previous[pointId] ?? getInitialRow(point)]
        })))
      } catch (error) {
        console.error(error)
        setContextError(error?.message || 'Impossible de charger la saisie rapide.')
      } finally {
        if (!ignore) {
          setIsContextLoading(false)
        }
      }
    }

    loadContext()

    return () => {
      ignore = true
    }
  }, [
    canCreateQuickDeclaration,
    quickEnabledForCurrentDeclarant,
    selectedPreleveurId,
    shouldSelectPreleveur,
    targetDeclarantUserId
  ])

  const updateRow = useCallback((pointId, changes) => {
    setRows(previous => ({
      ...previous,
      [pointId]: {
        ...getRowState(previous, pointId),
        ...changes
      }
    }))
  }, [])

  const focusPoint = useCallback(pointId => {
    setActivePointId(pointId)
    setHoveredPointId(pointId)

    const input = inputRefs.current[pointId]
    if (input) {
      input.focus({preventScroll: true})
    }
  }, [])

  const focusNextPoint = useCallback(pointId => {
    const currentIndex = entryPoints.findIndex(point => isPointIdEqual(getPointId(point), pointId))

    if (currentIndex < 0) {
      return
    }

    const nextPoint = entryPoints[currentIndex + 1]

    if (nextPoint) {
      focusPoint(getPointId(nextPoint))
    }
  }, [entryPoints, focusPoint])

  const handleIndexChange = useCallback((pointId, event) => {
    const editableCharactersCount = countEditableNumberCharacters(
      event.target.value,
      event.target.selectionStart ?? event.target.value.length
    )
    const index = normalizeNumberInput(event.target.value)

    updateRow(pointId, {index})

    requestAnimationFrame(() => {
      const input = inputRefs.current[pointId]

      if (!input || document.activeElement !== input) {
        return
      }

      const position = getFormattedCaretPosition(formatIndexInput(index), editableCharactersCount)
      input.setSelectionRange(position, position)
    })
  }, [updateRow])

  const {entries, validationErrors} = useMemo(() => {
    const nextEntries = []
    const nextValidationErrors = []

    for (const point of entryPoints) {
      const pointId = getPointId(point)
      const pointName = getPointName(point)
      const row = getRowState(rows, pointId)
      const hasIndex = row.index !== ''
      const hasCompleteIndex = isCompleteNumberInput(row.index)
      const hasUsage = Boolean(row.usage)

      if (hasIndex) {
        const index = Number(row.index)

        if (!hasCompleteIndex || !Number.isFinite(index) || index < 0) {
          nextValidationErrors.push(`${pointName} : l’index doit être un nombre positif.`)
        }

        if (!hasUsage) {
          nextValidationErrors.push(`${pointName} : l’usage est requis si un index est renseigné.`)
        }

        if (hasUsage && hasCompleteIndex && Number.isFinite(index) && index >= 0) {
          nextEntries.push({
            pointPrelevementId: pointId,
            index,
            usage: row.usage
          })
        }
      }
    }

    if (!readingDate) {
      nextValidationErrors.push('La date de relevé est obligatoire.')
    }

    if (isFutureDate(readingDate, maxReadingDate)) {
      nextValidationErrors.push('La date de relevé ne peut pas être dans le futur.')
    }

    return {
      entries: nextEntries,
      validationErrors: nextValidationErrors
    }
  }, [entryPoints, maxReadingDate, readingDate, rows])

  const hasAnyIndex = useMemo(
    () => Object.values(rows).some(row => row.index !== ''),
    [rows]
  )

  useEffect(() => {
    onDirtyChange?.(hasAnyIndex)
  }, [hasAnyIndex, onDirtyChange])

  const applyPreleveurChange = useCallback(nextPreleveurId => {
    setSelectedPreleveurId(nextPreleveurId)
    setRows({})
  }, [])

  const handlePreleveurChange = useCallback(nextPreleveurId => {
    if (nextPreleveurId === selectedPreleveurId) {
      return
    }

    if (hasAnyIndex) {
      setPendingPreleveurId(nextPreleveurId)
      setPreleveurChangeModalOpen(true)
      return
    }

    applyPreleveurChange(nextPreleveurId)
  }, [applyPreleveurChange, hasAnyIndex, selectedPreleveurId])

  const closePreleveurChangeModal = useCallback(() => {
    setPendingPreleveurId(null)
    setPreleveurChangeModalOpen(false)
  }, [])

  const confirmPreleveurChange = useCallback(() => {
    applyPreleveurChange(pendingPreleveurId ?? '')
    setPendingPreleveurId(null)
    setPreleveurChangeModalOpen(false)
  }, [applyPreleveurChange, pendingPreleveurId])

  const canSubmit = canSubmitQuickDeclaration({
    context,
    entries,
    isContextLoading,
    isSubmitting,
    validationErrors
  })
  const submitButtonLabel = getSubmitButtonLabel(isSubmitting, entries.length)

  const submit = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      if (!canSubmit) {
        throw new Error(validationErrors[0] || 'Saisie incomplète.')
      }

      const result = await createQuickDeclarationAction({
        declarantUserId: targetDeclarantUserId,
        readingDate,
        comment,
        entries
      })

      if (!result?.success || !result.data?.success) {
        throw new Error(result?.error || result?.data?.message || 'Erreur lors de la création de la déclaration.')
      }

      setSubmitResult({status: 'success', message: 'Déclaration créée avec succès.'})
      window.location.href = getMyDeclarationURL(result.data.data)
    } catch (error) {
      console.error(error)
      setSubmitResult({
        status: 'error',
        message: error?.message || 'Erreur lors de la soumission.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [canSubmit, comment, entries, readingDate, targetDeclarantUserId, validationErrors])

  const unavailableAlertProps = getQuickDeclarationUnavailableAlertProps({
    availablePreleveurs,
    canCreateQuickDeclaration,
    declarantRole,
    quickDeclarationEnabled
  })

  if (unavailableAlertProps) {
    return <Alert {...unavailableAlertProps} />
  }

  return (
    <div className='fr-mt-1w fr-mb-2w'>
      <div className='grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)] xl:items-start'>
        <section className='order-2 xl:order-1 min-w-0'>
          <QuickDeclarationToolbar
            availablePreleveurs={availablePreleveurs}
            context={context}
            maxReadingDate={maxReadingDate}
            pointsCount={pointsCount}
            readingDate={readingDate}
            selectedPreleveurId={selectedPreleveurId}
            setReadingDate={setReadingDate}
            shouldSelectPreleveur={shouldSelectPreleveur}
            onPreleveurChange={handlePreleveurChange}
          />

          <QuickDeclarationStatusAlerts
            context={context}
            contextError={contextError}
            isContextLoading={isContextLoading}
            pointsCount={pointsCount}
            selectedPreleveur={selectedPreleveur}
            selectedPreleveurId={selectedPreleveurId}
            shouldSelectPreleveur={shouldSelectPreleveur}
          />

          <QuickDeclarationEntriesPanel
            activePointId={activePointId}
            canSubmit={canSubmit}
            comment={comment}
            context={context}
            entries={entries}
            entryPoints={entryPoints}
            focusNextPoint={focusNextPoint}
            focusPoint={focusPoint}
            globalUsageOptions={globalUsageOptions}
            handleIndexChange={handleIndexChange}
            hasAnyIndex={hasAnyIndex}
            hoveredPointId={hoveredPointId}
            inputRefs={inputRefs}
            pointsCount={pointsCount}
            readingDate={readingDate}
            rows={rows}
            setActivePointId={setActivePointId}
            setComment={setComment}
            setHoveredPointId={setHoveredPointId}
            submit={submit}
            submitButtonLabel={submitButtonLabel}
            submitResult={submitResult}
            updateRow={updateRow}
            validationErrors={validationErrors}
          />
        </section>

        <QuickDeclarationMapPanel
          activePointId={activePointId}
          context={context}
          declaredPointIds={declaredPointIds}
          declarantName={contactDeclarantName}
          entryPoints={entryPoints}
          focusPoint={focusPoint}
          hoveredPointId={hoveredPointId}
          pointsCount={pointsCount}
          selectedPointIds={selectedPointIds}
          setHoveredPointId={setHoveredPointId}
        />
      </div>

      <UnsavedPreleveurChangeModal
        open={preleveurChangeModalOpen}
        close={closePreleveurChangeModal}
        confirm={confirmPreleveurChange}
      />
    </div>
  )
}

export default QuickDeclarationForm
