'use client'

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import dynamic from 'next/dynamic'

import DeclarationPointsChangeRequestAction from '@/components/declarations/declaration-points-change-request-action.js'
import DeferredRender from '@/components/ui/deferred-render.js'
import {
  POINT_ASSOCIATION_ORIGINS,
  canChangeChunkPointAssociation
} from '@/lib/chunk-point-associations.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {
  getDeclarationDisplayStatus,
  getSourcePeriodLabel
} from '@/lib/declaration.js'
import {formatDateRange} from '@/lib/format-date.js'
import {getPointFlowType, getPointFlowTypeLabel, POINT_FLOW_TYPES} from '@/lib/point-flow-types.js'
import {
  formatUsageReference,
  getUsageColor,
  getUsageReferenceLabel,
  getUsageTextColor
} from '@/lib/water-uses.js'
import {reconcileDeclarationChunkAction} from '@/server/actions/declarations.js'
import {formatNumber} from '@/utils/number.js'

const DynamicPointReconciliationMap = dynamic(
  () => import('@/components/declarations/point-reconciliation-map.js'),
  {ssr: false}
)

const PointReconciliationMap = props => (
  <DeferredRender
    className='w-full'
    minHeight='clamp(380px, 62vh, 640px)'
    placeholder={(
      <div className='flex h-[clamp(380px,62vh,640px)] items-center justify-center bg-gray-100' role='status'>
        Chargement de la carte…
      </div>
    )}
    rootMargin='400px 0px'
  >
    <DynamicPointReconciliationMap {...props} />
  </DeferredRender>
)

const CHUNK_LIST_SCROLL_FACTOR = 1.8
const AVAILABLE_POINT_COLOR = '#000091'
const MATCHED_POINT_COLOR = '#18753c'
const POINTS_TO_ASSOCIATE_ANCHOR_ID = 'points-a-associer'
const ASSOCIATION_INTRO = 'Certains points de votre fichier n\'ont pas pu être reliés automatiquement aux points de prélèvement connus sur votre territoire. Demandez la création du point ou associez-les manuellement pour que les volumes déclarés soient rattachés au bon point.'

function isChunkMatched(chunk) {
  return Boolean(chunk?.pointPrelevementId)
}

function normalizeSearchValue(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .trim()
    .replaceAll(/\s+/g, ' ')
    .toLocaleLowerCase('fr-FR')
}

function getChunkPointName(chunk) {
  return chunk?.pointPrelevement?.name || chunk?.pointPrelevementName || 'Point du fichier'
}

function getChunkSourceFlowType(chunk) {
  const sourceFlowType = chunk?.metadata?.sourceFlowType ?? chunk?.metadata?.source_flow_type
  return Object.values(POINT_FLOW_TYPES).includes(sourceFlowType) ? sourceFlowType : null
}

function getRawPointName(chunk) {
  return chunk?.pointPrelevementName || 'Nom non identifié'
}

function getChunkPreleveurLabel(chunk) {
  if (chunk?.preleveur) {
    return getDeclarantTitleFromDeclarant(chunk.preleveur)
  }

  return chunk?.metadata?.externalDeclarant?.name ?? null
}

function getChunkTitle(chunk, index) {
  const rawName = getRawPointName(chunk)

  if (rawName !== 'Nom non identifié') {
    return rawName
  }

  return `Ligne ${index + 1}`
}

function getSummarySeverity({remainingCount, totalCount}) {
  if (remainingCount === 0) {
    return 'success'
  }

  if (remainingCount === totalCount) {
    return 'error'
  }

  return 'warning'
}

function formatRemainingAssociationTitle(remainingCount) {
  return `${remainingCount} point${remainingCount > 1 ? 's' : ''} restant${remainingCount > 1 ? 's' : ''} à associer`
}

function getChunkVolumeLabel(chunk) {
  const withdrawn = chunk?.metadata?.totalWaterVolumeWithdrawn
  const discharged = chunk?.metadata?.totalWaterVolumeDischarged
  const parts = []

  if (typeof withdrawn === 'number' && withdrawn > 0) {
    parts.push(`${formatNumber(withdrawn)} m³ prélevés`)
  }

  if (typeof discharged === 'number' && discharged > 0) {
    parts.push(`${formatNumber(discharged)} m³ rejetés`)
  }

  return parts.join(' • ')
}

const ChunkStatusBadge = ({matched}) => (
  <span className={`inline-flex whitespace-nowrap border px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase leading-none ${matched ? 'border-transparent bg-[#e6f4ea] text-[#18753c]' : 'border-[#ce614a] bg-[#fff4f0] text-[#8d533e]'}`}>
    {matched ? 'Associé' : 'À associer'}
  </span>
)

const UsageReference = ({label, usage}) => (
  <div className='mt-2 flex min-w-0 items-center gap-1.5 text-xs text-gray-700' title={label}>
    <span className='shrink-0 font-medium text-gray-600'>{getUsageReferenceLabel(usage)} :</span>
    <span
      className='inline-flex min-w-0 max-w-full items-center truncate px-1.5 py-0.5 text-[0.68rem] font-semibold leading-none'
      style={{
        backgroundColor: getUsageColor(usage),
        color: getUsageTextColor(usage)
      }}
    >
      {label}
    </span>
  </div>
)

function getChunkItemClassName({isSelected, matched}) {
  const baseClassName = 'relative w-full border p-3 text-left transition-colors'

  if (isSelected) {
    return 'relative w-full border-2 border-[#000091] bg-[#f5f5fe] p-[11px] text-left shadow-sm transition-colors'
  }

  if (matched) {
    return `${baseClassName} border-gray-300 bg-white hover:bg-gray-50`
  }

  return `${baseClassName} border-gray-300 bg-white hover:bg-gray-50`
}

function getAssociationLabel({chunk, isSelected}) {
  if (isChunkMatched(chunk)) {
    return `Associé à ${getChunkPointName(chunk)}`
  }

  return isSelected ? 'Choisissez un point sur la carte' : 'Aucune association'
}

function getChunkSearchText(chunk, index) {
  return normalizeSearchValue([
    getChunkTitle(chunk, index),
    getRawPointName(chunk),
    getChunkPointName(chunk),
    getChunkPreleveurLabel(chunk),
    getAssociationLabel({chunk, isSelected: false}),
    getUsageReferenceLabel(chunk.usage),
    formatUsageReference(chunk.usage)
  ].join(' '))
}

function getPointSearchText(point) {
  return normalizeSearchValue([
    point?.name,
    point?.codeBSS,
    ...(point?.pointPrelevementNameAliases ?? []),
    point?.waterBodyType,
    point?.nature,
    point?.withdrawalType,
    getPointFlowTypeLabel(getPointFlowType(point))
  ].filter(Boolean).join(' '))
}

function datesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  if (!firstStart || !firstEnd || !secondStart || !secondEnd) {
    return false
  }

  const firstStartDate = new Date(firstStart)
  const firstEndDate = new Date(firstEnd)
  const secondStartDate = new Date(secondStart)
  const secondEndDate = new Date(secondEnd)

  if (
    Number.isNaN(firstStartDate.getTime())
    || Number.isNaN(firstEndDate.getTime())
    || Number.isNaN(secondStartDate.getTime())
    || Number.isNaN(secondEndDate.getTime())
  ) {
    return false
  }

  return firstStartDate <= secondEndDate && firstEndDate >= secondStartDate
}

function getNextUnmatchedChunk(chunks, selectedChunkId) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return null
  }

  const selectedIndex = chunks.findIndex(chunk => chunk.id === selectedChunkId)
  const startIndex = selectedIndex >= 0 ? selectedIndex + 1 : 0

  for (let offset = 0; offset < chunks.length; offset++) {
    const chunk = chunks[(startIndex + offset) % chunks.length]

    if (chunk.id !== selectedChunkId && !isChunkMatched(chunk)) {
      return chunk
    }
  }

  return null
}

function getLocalConflictByPointId(chunks, selectedChunk) {
  if (!selectedChunk) {
    return {}
  }

  const conflictByPointId = {}

  for (const [index, chunk] of chunks.entries()) {
    if (
      chunk.id === selectedChunk.id
      || !chunk.pointPrelevementId
      || !datesOverlap(selectedChunk.minDate, selectedChunk.maxDate, chunk.minDate, chunk.maxDate)
    ) {
      continue
    }

    conflictByPointId[chunk.pointPrelevementId] ||= {
      chunk,
      chunkId: chunk.id,
      label: getChunkTitle(chunk, index),
      periodLabel: formatDateRange(chunk.minDate, chunk.maxDate)
    }
  }

  return conflictByPointId
}

function getReconciliationErrorMessage(result) {
  if (result?.code === 409) {
    return result?.data?.message
      || 'Ce point contient déjà des données sur une période qui chevauche cette ligne. Choisissez un autre point ou corrigez l’association existante.'
  }

  return result?.error || result?.data?.message || 'L’association n’a pas pu être enregistrée.'
}

function focusChunkListItem(currentItem, targetIndex) {
  const list = currentItem.closest('[data-chunk-list]')
  const items = [...(list?.querySelectorAll('[data-chunk-list-item]') ?? [])]
  const target = items[targetIndex]

  target?.focus()
}

const ChunkListItem = ({
  canDetach = false,
  chunk,
  feedbackMessage = null,
  index,
  itemRef,
  isSelected,
  isSubmitting = false,
  showStatus = true,
  showUsage = true,
  onDetach,
  onSelect
}) => {
  const matched = isChunkMatched(chunk)
  const chunkTitle = getChunkTitle(chunk, index)
  const volumeLabel = getChunkVolumeLabel(chunk)
  const preleveurLabel = getChunkPreleveurLabel(chunk)
  const usageLabel = formatUsageReference(chunk.usage)
  const flowTypeLabel = chunk.flowType ? getPointFlowTypeLabel(chunk.flowType) : null
  const handleKeyDown = event => {
    if (event.target !== event.currentTarget) {
      return
    }

    const list = event.currentTarget.closest('[data-chunk-list]')
    const items = [...(list?.querySelectorAll('[data-chunk-list-item]') ?? [])]
    const currentIndex = items.indexOf(event.currentTarget)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusChunkListItem(event.currentTarget, Math.min(currentIndex + 1, items.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusChunkListItem(event.currentTarget, Math.max(currentIndex - 1, 0))
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      focusChunkListItem(event.currentTarget, 0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      focusChunkListItem(event.currentTarget, items.length - 1)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      ref={itemRef}
      className={`${getChunkItemClassName({isSelected, matched})} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#000091]`}
      data-chunk-list-item='true'
      role='button'
      tabIndex={0}
      aria-label={`Sélectionner ${chunkTitle}`}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='truncate text-sm font-bold text-gray-900' title={chunkTitle}>
              {chunkTitle}
            </span>
            {flowTypeLabel && (
              <span className='text-[0.68rem] font-medium text-gray-600'>
                {flowTypeLabel}
              </span>
            )}
          </div>
          <div
            className={matched ? 'truncate text-xs text-[#18753c]' : 'truncate text-xs text-gray-600'}
            title={matched ? getChunkPointName(chunk) : undefined}
          >
            {getAssociationLabel({chunk, isSelected})}
          </div>

          {preleveurLabel && (
            <div className='mt-1 truncate text-xs font-medium text-gray-700' title={preleveurLabel}>
              Préleveur : {preleveurLabel}
            </div>
          )}

          {showUsage && usageLabel && <UsageReference label={usageLabel} usage={chunk.usage} />}

          {volumeLabel && (
            <div className='mt-2 text-xs text-gray-600'>
              {volumeLabel}
            </div>
          )}

          {feedbackMessage && (
            <div className='mt-2 text-xs font-medium text-[#18753c]' role='status'>
              {feedbackMessage}
            </div>
          )}
        </div>

        <div className='flex shrink-0 flex-col items-end gap-2'>
          {showStatus && <ChunkStatusBadge matched={matched} />}
          {canDetach && (
            <button
              type='button'
              className='fr-btn fr-btn--secondary fr-btn--sm'
              disabled={isSubmitting}
              onClick={event => {
                event.stopPropagation()
                onDetach?.()
              }}
            >
              Détacher
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const MapLegendCheckbox = ({
  checked,
  checkedClassName,
  checkboxClassName,
  inputId,
  label,
  markerClassName,
  markerStyle,
  onChange
}) => (
  <label
    className={`inline-flex cursor-pointer items-center gap-1.5 border px-2 py-1 text-sm font-medium transition-colors ${checked ? checkedClassName : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
    htmlFor={inputId}
  >
    <input
      checked={checked}
      className={`h-3.5 w-3.5 shrink-0 ${checkboxClassName}`}
      id={inputId}
      type='checkbox'
      onChange={event => onChange(event.target.checked)}
    />
    <span
      className={`${markerClassName} ${checked ? '' : 'opacity-40'}`}
      style={markerStyle}
      aria-hidden='true'
    />
    <span>{label}</span>
  </label>
)
const MapPointsLegend = ({
  mode,
  showMatchedPoints,
  showUnmatchedPoints,
  onToggleMatchedPoints,
  onToggleUnmatchedPoints
}) => {
  const unmatchedInputId = useId()
  const matchedInputId = useId()
  const canToggleUnmatchedPoints = mode === 'association'

  const matchedLabel = mode === 'readonly'
    ? 'Points rattachés à la déclaration'
    : 'Points déjà rattachés'

  return (
    <div className='mt-2 flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-gray-600' aria-label='Légende de la carte'>
      {canToggleUnmatchedPoints && (
        <MapLegendCheckbox
          checked={showUnmatchedPoints}
          checkedClassName='border-[#000091] bg-[#f5f5fe] text-gray-900'
          checkboxClassName='accent-[#000091]'
          inputId={unmatchedInputId}
          label='Points disponibles à associer'
          markerClassName='h-4 w-4 rounded-full border-2 border-white shadow-sm ring-2 ring-[#000091]/20'
          markerStyle={{backgroundColor: AVAILABLE_POINT_COLOR}}
          onChange={onToggleUnmatchedPoints}
        />
      )}

      <MapLegendCheckbox
        checked={showMatchedPoints}
        checkedClassName='border-[#18753c] bg-[#f3fbf6] text-gray-900'
        checkboxClassName='accent-[#18753c]'
        inputId={matchedInputId}
        label={matchedLabel}
        markerClassName='h-4 w-4 rounded-full border-2 border-white shadow-sm ring-2 ring-[#18753c]/25'
        markerStyle={{backgroundColor: MATCHED_POINT_COLOR}}
        onChange={onToggleMatchedPoints}
      />
    </div>
  )
}

const AssociationSummary = ({
  remainingCount,
  totalCount
}) => (
  <Alert
    severity={getSummarySeverity({remainingCount, totalCount})}
    title={formatRemainingAssociationTitle(remainingCount)}
  />
)

const PointReconciliationPanel = ({
  availablePoints = [],
  canReconcile = false,
  declaration,
  onDeclarationChange,
  source
}) => {
  const unmatchedOnlyInputId = useId()
  const selectedChunkItemRef = useRef(null)
  const chunks = useMemo(() => source?.chunks ?? [], [source?.chunks])
  const remainingCount = chunks.filter(chunk => !isChunkMatched(chunk)).length
  const totalCount = chunks.length
  const firstUnmatchedChunk = useMemo(
    () => chunks.find(chunk => !isChunkMatched(chunk)) ?? null,
    [chunks]
  )
  const firstUnmatchedChunkId = useMemo(
    () => firstUnmatchedChunk?.id ?? chunks[0]?.id ?? null,
    [chunks, firstUnmatchedChunk?.id]
  )
  const initialSelectedChunk = useMemo(
    () => chunks.find(chunk => chunk.id === firstUnmatchedChunkId) ?? null,
    [chunks, firstUnmatchedChunkId]
  )
  const [selectedChunkId, setSelectedChunkId] = useState(firstUnmatchedChunkId)
  const [activePointId, setActivePointId] = useState(initialSelectedChunk?.pointPrelevementId ?? null)
  const [focusRequestKey, setFocusRequestKey] = useState(0)
  const [hoveredPointId, setHoveredPointId] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [completionSuccess, setCompletionSuccess] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [chunkSearch, setChunkSearch] = useState('')
  const [pointSearch, setPointSearch] = useState('')
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(remainingCount > 0)
  const [isAssociationMode, setIsAssociationMode] = useState(remainingCount > 0)
  const [showUnmatchedMapPoints, setShowUnmatchedMapPoints] = useState(remainingCount > 0)
  const [showMatchedMapPoints, setShowMatchedMapPoints] = useState(remainingCount === 0)
  const previousRemainingCountRef = useRef(remainingCount)
  const previousSourceIdRef = useRef(null)

  const handleSelectChunk = useCallback(chunk => {
    if (!chunk) {
      return
    }

    setSelectedChunkId(chunk.id)
    setActivePointId(chunk.pointPrelevementId ?? null)

    if (chunk.pointPrelevementId) {
      setFocusRequestKey(current => current + 1)
    }

    setSubmitError(null)
    setSubmitSuccess(null)
  }, [])

  useEffect(() => {
    if (!chunks.some(chunk => chunk.id === selectedChunkId)) {
      setSelectedChunkId(firstUnmatchedChunkId)
      setActivePointId(initialSelectedChunk?.pointPrelevementId ?? null)
    }
  }, [chunks, firstUnmatchedChunkId, initialSelectedChunk?.pointPrelevementId, selectedChunkId])

  useEffect(() => {
    if (previousSourceIdRef.current === source?.id) {
      return
    }

    const shouldEditAssociations = remainingCount > 0

    previousSourceIdRef.current = source?.id
    setIsAssociationMode(shouldEditAssociations)
    setShowOnlyUnmatched(shouldEditAssociations)
    setShowUnmatchedMapPoints(shouldEditAssociations)
    setShowMatchedMapPoints(!shouldEditAssociations)
    previousRemainingCountRef.current = remainingCount
    setCompletionSuccess(null)
    setSubmitError(null)
    setSubmitSuccess(null)
  }, [remainingCount, source?.id])

  useEffect(() => {
    const previousRemainingCount = previousRemainingCountRef.current

    if (remainingCount > 0 && previousRemainingCount === 0) {
      setIsAssociationMode(true)
      setShowOnlyUnmatched(true)
      setShowUnmatchedMapPoints(true)
      setShowMatchedMapPoints(false)
      setCompletionSuccess(null)
    } else if (remainingCount === 0 && previousRemainingCount > 0) {
      setIsAssociationMode(false)
      setShowOnlyUnmatched(false)
      setShowUnmatchedMapPoints(false)
      setShowMatchedMapPoints(true)
      setCompletionSuccess('Tous les points détectés dans le fichier sont maintenant associés.')
    }

    previousRemainingCountRef.current = remainingCount
  }, [remainingCount])

  useEffect(() => {
    selectedChunkItemRef.current?.scrollIntoView({
      behavior: 'auto',
      block: 'nearest'
    })
  }, [selectedChunkId])

  const matchedPointIds = useMemo(
    () => chunks.map(chunk => chunk.pointPrelevementId).filter(Boolean),
    [chunks]
  )
  const matchedPointIdSet = useMemo(
    () => new Set(matchedPointIds.map(String)),
    [matchedPointIds]
  )
  const selectedChunk = useMemo(
    () => chunks.find(chunk => chunk.id === selectedChunkId) ?? null,
    [chunks, selectedChunkId]
  )
  const selectedChunkWithIndex = useMemo(() => {
    if (!selectedChunk) {
      return null
    }

    return {
      ...selectedChunk,
      index: chunks.findIndex(chunk => chunk.id === selectedChunk.id)
    }
  }, [chunks, selectedChunk])

  const hasChangeablePointAssociations = chunks.some(chunk => canChangeChunkPointAssociation(chunk))
  const canEditAssociations = canReconcile && isAssociationMode
  const canSubmitReconciliation = canEditAssociations
    && Boolean(selectedChunk)
    && selectedChunk.canReconcile !== false
    && canChangeChunkPointAssociation(selectedChunk)
  const shouldShowAssociationWorkflow = isAssociationMode && remainingCount > 0
  const nextUnmatchedChunk = useMemo(
    () => getNextUnmatchedChunk(chunks, selectedChunkId),
    [chunks, selectedChunkId]
  )
  const localConflictByPointId = useMemo(
    () => getLocalConflictByPointId(chunks, selectedChunk),
    [chunks, selectedChunk]
  )
  const normalizedChunkSearch = normalizeSearchValue(chunkSearch)
  const chunkItems = useMemo(
    () => chunks.map((chunk, index) => ({chunk, index})),
    [chunks]
  )
  const searchableChunkItems = useMemo(
    () => shouldShowAssociationWorkflow && showOnlyUnmatched
      ? chunkItems.filter(({chunk}) => !isChunkMatched(chunk))
      : chunkItems,
    [chunkItems, shouldShowAssociationWorkflow, showOnlyUnmatched]
  )
  const visibleChunkItems = useMemo(() => searchableChunkItems
    .filter(({chunk, index}) => {
      if (!normalizedChunkSearch) {
        return true
      }

      return getChunkSearchText(chunk, index).includes(normalizedChunkSearch)
    }), [normalizedChunkSearch, searchableChunkItems])
  const visibleChunkCounterLabel = `${visibleChunkItems.length}/${totalCount} ligne${totalCount > 1 ? 's' : ''}`
  const totalChunkCounterLabel = `${totalCount} ligne${totalCount > 1 ? 's' : ''}`
  const normalizedPointSearch = normalizeSearchValue(pointSearch)
  const filteredAvailablePoints = useMemo(() => {
    const sourceFlowType = getChunkSourceFlowType(selectedChunk)

    return availablePoints.filter(point => {
      const hasCompatibleFlowType = !sourceFlowType || getPointFlowType(point) === sourceFlowType
      const matchesSearch = !normalizedPointSearch
        || getPointSearchText(point).includes(normalizedPointSearch)

      return hasCompatibleFlowType && matchesSearch
    })
  }, [availablePoints, normalizedPointSearch, selectedChunk])
  const visibleAvailablePoints = useMemo(() => {
    const pointOptions = isAssociationMode ? filteredAvailablePoints : availablePoints

    return pointOptions.filter(point => {
      const matched = matchedPointIdSet.has(String(point.id))
      return matched ? showMatchedMapPoints : showUnmatchedMapPoints
    })
  }, [
    availablePoints,
    filteredAvailablePoints,
    isAssociationMode,
    matchedPointIdSet,
    showMatchedMapPoints,
    showUnmatchedMapPoints
  ])

  useEffect(() => {
    if (!activePointId) {
      return
    }

    if (!visibleAvailablePoints.some(point => String(point.id) === String(activePointId))) {
      setActivePointId(null)
    }
  }, [activePointId, visibleAvailablePoints])

  const handleSelectNextUnmatchedChunk = useCallback(() => {
    if (nextUnmatchedChunk) {
      handleSelectChunk(nextUnmatchedChunk)
    }
  }, [handleSelectChunk, nextUnmatchedChunk])

  const handleEnterAssociationView = useCallback(() => {
    const hasRemainingAssociations = remainingCount > 0

    setIsAssociationMode(true)
    setShowOnlyUnmatched(hasRemainingAssociations)
    setShowUnmatchedMapPoints(true)
    setShowMatchedMapPoints(true)
    setCompletionSuccess(null)
    setSubmitError(null)
    setSubmitSuccess(null)
  }, [remainingCount])

  const handleLeaveAssociationView = useCallback(() => {
    setIsAssociationMode(false)
    setShowOnlyUnmatched(false)
    setShowUnmatchedMapPoints(false)
    setShowMatchedMapPoints(true)
    setSubmitError(null)
    setSubmitSuccess(null)
  }, [])

  const handleSelectConflictChunk = useCallback(chunkId => {
    const conflictChunk = chunks.find(chunk => chunk.id === chunkId)

    if (conflictChunk) {
      handleSelectChunk(conflictChunk)
    }
  }, [chunks, handleSelectChunk])

  const handleChunkListWheel = useCallback(event => {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      return
    }

    const container = event.currentTarget
    const maxScrollTop = container.scrollHeight - container.clientHeight

    if (maxScrollTop <= 0) {
      return
    }

    const nextScrollTop = Math.max(
      0,
      Math.min(maxScrollTop, container.scrollTop + (event.deltaY * CHUNK_LIST_SCROLL_FACTOR))
    )

    if (nextScrollTop === container.scrollTop) {
      return
    }

    event.preventDefault()
    container.scrollTop = nextScrollTop
  }, [])

  useEffect(() => {
    if (isAssociationMode && showOnlyUnmatched && selectedChunk && isChunkMatched(selectedChunk) && nextUnmatchedChunk) {
      handleSelectChunk(nextUnmatchedChunk)
    }
  }, [handleSelectChunk, isAssociationMode, nextUnmatchedChunk, selectedChunk, showOnlyUnmatched])

  const updateSelectedChunkAssociation = useCallback(({
    globalInstructionStatus,
    point,
    pointAssociationOrigin
  }) => {
    if (!selectedChunk) {
      return
    }

    const nextPointPrelevementId = point?.id ?? null
    const nextDeclaration = {
      ...declaration,
      source: {
        ...declaration.source,
        globalInstructionStatus: globalInstructionStatus ?? declaration.source?.globalInstructionStatus,
        chunks: (declaration.source?.chunks ?? []).map(chunk => {
          if (chunk.id !== selectedChunk.id) {
            return chunk
          }

          return {
            ...chunk,
            instructionStatus: nextPointPrelevementId ? 'VALIDATED' : 'PENDING',
            pointPrelevementId: nextPointPrelevementId,
            pointPrelevement: point ?? null,
            pointAssociationOrigin: pointAssociationOrigin
              ?? (nextPointPrelevementId ? POINT_ASSOCIATION_ORIGINS.MANUAL : null)
          }
        })
      }
    }

    onDeclarationChange?.(nextDeclaration)
  }, [declaration, onDeclarationChange, selectedChunk])

  const handleReconcilePoint = useCallback(async pointPrelevementId => {
    if (!canSubmitReconciliation || !selectedChunk) {
      setSubmitError('Sélectionnez une ligne à associer.')
      return
    }

    if (isSubmitting) {
      return
    }

    if (selectedChunk.pointPrelevementId === pointPrelevementId) {
      setSubmitError(null)
      setSubmitSuccess('Association déjà enregistrée')
      return
    }

    setSubmitError(null)
    setSubmitSuccess(null)
    setIsSubmitting(true)

    try {
      const point = availablePoints.find(candidate => candidate.id === pointPrelevementId) ?? null
      const result = await reconcileDeclarationChunkAction({
        declarationId: declaration.id,
        chunkId: selectedChunk.id,
        pointPrelevementId
      })

      if (!result?.success) {
        setSubmitError(getReconciliationErrorMessage(result))
        return
      }

      updateSelectedChunkAssociation({
        globalInstructionStatus: result.data?.data?.globalInstructionStatus,
        point,
        pointAssociationOrigin: result.data?.data?.pointAssociationOrigin
      })

      if (showOnlyUnmatched && nextUnmatchedChunk) {
        handleSelectChunk(nextUnmatchedChunk)
        return
      }

      setActivePointId(pointPrelevementId)
      setFocusRequestKey(current => current + 1)
      setSubmitSuccess('Association enregistrée')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    availablePoints,
    canSubmitReconciliation,
    declaration.id,
    handleSelectChunk,
    isSubmitting,
    nextUnmatchedChunk,
    selectedChunk,
    showOnlyUnmatched,
    updateSelectedChunkAssociation
  ])

  const handleDetachPoint = useCallback(async () => {
    if (!canEditAssociations || !selectedChunk?.pointPrelevementId) {
      return
    }

    if (isSubmitting) {
      return
    }

    setSubmitError(null)
    setSubmitSuccess(null)
    setIsSubmitting(true)

    try {
      const result = await reconcileDeclarationChunkAction({
        declarationId: declaration.id,
        chunkId: selectedChunk.id,
        pointPrelevementId: null
      })

      if (!result?.success) {
        setSubmitError(result?.error || result?.data?.message || 'L’association n’a pas pu être retirée.')
        return
      }

      updateSelectedChunkAssociation({
        globalInstructionStatus: result.data?.data?.globalInstructionStatus,
        point: null,
        pointAssociationOrigin: null
      })
      setActivePointId(null)
      setSubmitSuccess('Association retirée')
    } finally {
      setIsSubmitting(false)
    }
  }, [canEditAssociations, declaration.id, isSubmitting, selectedChunk, updateSelectedChunkAssociation])

  if (totalCount === 0) {
    return (
      <Alert
        severity='info'
        title='Aucun point détecté'
        description='Le traitement du fichier n’a pas produit de point à associer.'
      />
    )
  }

  let mapEmptyMessage

  if (!showMatchedMapPoints && !showUnmatchedMapPoints) {
    mapEmptyMessage = 'Aucun type de point sélectionné.'
  } else if (!isAssociationMode) {
    mapEmptyMessage = 'Aucun point associé géolocalisé.'
  } else if (normalizedPointSearch && filteredAvailablePoints.length === 0) {
    mapEmptyMessage = 'Aucun point ne correspond à la recherche.'
  }

  const pointCounterLabel = isAssociationMode
    ? `${visibleAvailablePoints.length}/${filteredAvailablePoints.length}`
    : `${visibleAvailablePoints.length} point${visibleAvailablePoints.length > 1 ? 's' : ''}`
  const mapLegendMode = isAssociationMode ? 'association' : 'readonly'
  const pointsChangeStatus = getDeclarationDisplayStatus(declaration, source)
  const pointsChangePeriodLabel = getSourcePeriodLabel(source)

  return (
    <section className='fr-mb-4w border border-gray-200 bg-white p-5 md:p-6'>
      <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div>
          {shouldShowAssociationWorkflow ? (
            <h2 className='fr-text--md fr-mb-0 font-semibold leading-snug text-gray-900'>
              {ASSOCIATION_INTRO}
            </h2>
          ) : (
            <>
              <h2 className='fr-h4 fr-mb-1v'>Points de prélèvement déclarés</h2>
              <p className='fr-text--sm fr-mb-0 text-gray-600'>
                {totalCount} point{totalCount > 1 ? 's' : ''} détecté{totalCount > 1 ? 's' : ''} dans le fichier.
              </p>
            </>
          )}
        </div>

        {canReconcile && hasChangeablePointAssociations && (
          <div className='flex shrink-0 flex-wrap gap-2'>
            {isAssociationMode ? (
              remainingCount === 0 && (
                <button
                  type='button'
                  className='fr-btn fr-btn--secondary fr-btn--sm'
                  onClick={handleLeaveAssociationView}
                >
                  Voir en lecture seule
                </button>
              )
            ) : (
              <button
                type='button'
                className='fr-btn fr-btn--secondary fr-btn--sm'
                onClick={handleEnterAssociationView}
              >
                Modifier les associations
              </button>
            )}
          </div>
        )}
      </div>

      {shouldShowAssociationWorkflow && (
        <AssociationSummary
          remainingCount={remainingCount}
          totalCount={totalCount}
        />
      )}

      {!isAssociationMode && completionSuccess && (
        <Alert
          severity='success'
          title='Associations terminées'
          description={completionSuccess}
        />
      )}

      {isAssociationMode && submitError && (
        <Alert
          className='fr-mt-2w'
          severity='error'
          title='Association impossible'
          description={submitError}
        />
      )}

      <div className='fr-mt-3w grid gap-4 lg:grid-cols-[minmax(280px,420px)_1fr]'>
        <div id={POINTS_TO_ASSOCIATE_ANCHOR_ID}>
          <div className='mb-2 flex items-center justify-between gap-2'>
            <h2 className='fr-h6 fr-mb-0'>{shouldShowAssociationWorkflow ? 'Points du fichier à associer' : 'Lignes du fichier'}</h2>
            {shouldShowAssociationWorkflow ? (
              <button
                type='button'
                className='fr-btn fr-btn--secondary fr-btn--sm'
                disabled={!nextUnmatchedChunk}
                onClick={handleSelectNextUnmatchedChunk}
              >
                Suivant à associer
              </button>
            ) : (
              !isAssociationMode && (
                <span className='shrink-0 text-sm text-gray-600'>
                  {totalChunkCounterLabel}
                </span>
              )
            )}
          </div>

          {isAssociationMode && (
            <div className='mb-2 flex flex-col gap-2'>
              <input
                type='search'
                className='fr-input'
                aria-label='Rechercher une ligne importée'
                placeholder='Rechercher une ligne'
                value={chunkSearch}
                onChange={event => setChunkSearch(event.target.value)}
              />

              {shouldShowAssociationWorkflow && (
                <div className='flex items-center justify-between gap-3'>
                  <div className='fr-checkbox-group fr-mb-0 min-w-0'>
                    <input
                      checked={showOnlyUnmatched}
                      id={unmatchedOnlyInputId}
                      type='checkbox'
                      onChange={event => setShowOnlyUnmatched(event.target.checked)}
                    />
                    <label className='fr-label whitespace-nowrap text-[0.78rem]' htmlFor={unmatchedOnlyInputId}>
                      Afficher uniquement les points à associer
                    </label>
                  </div>
                  <span className='shrink-0 text-sm text-gray-600'>
                    {visibleChunkCounterLabel}
                  </span>
                </div>
              )}
            </div>
          )}

          <div
            data-chunk-list
            className='max-h-[min(70vh,720px)] space-y-2 overflow-y-auto pr-1'
            onWheel={handleChunkListWheel}
          >
            {visibleChunkItems.length === 0 ? (
              <div className='border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-600'>
                Aucune ligne.
              </div>
            ) : (
              visibleChunkItems.map(({chunk, index}) => (
                <ChunkListItem
                  key={chunk.id}
                  canDetach={
                    canEditAssociations
                    && chunk.id === selectedChunkId
                    && Boolean(chunk.pointPrelevementId)
                    && canChangeChunkPointAssociation(chunk)
                  }
                  chunk={chunk}
                  feedbackMessage={chunk.id === selectedChunkId ? submitSuccess : null}
                  index={index}
                  itemRef={chunk.id === selectedChunkId ? selectedChunkItemRef : undefined}
                  isSubmitting={isSubmitting}
                  isSelected={chunk.id === selectedChunkId}
                  showStatus={isAssociationMode}
                  showUsage={!isAssociationMode}
                  onDetach={handleDetachPoint}
                  onSelect={() => handleSelectChunk(chunk)}
                />
              ))
            )}
          </div>
        </div>

        <div className='min-h-0'>
          <div className='mb-2 flex items-center justify-between gap-2'>
            <h2 className='fr-h6 fr-mb-0'>
              {isAssociationMode ? 'Points de prélèvement du déclarant' : 'Points associés'}
            </h2>
            <span className='text-sm text-gray-600'>
              {pointCounterLabel}
            </span>
          </div>

          {isAssociationMode && (
            <input
              type='search'
              className='fr-input fr-mb-2w'
              aria-label='Rechercher un point de prélèvement'
              placeholder='Rechercher un point'
              value={pointSearch}
              onChange={event => setPointSearch(event.target.value)}
            />
          )}

          {shouldShowAssociationWorkflow && (
            <div className='mb-2 flex flex-col gap-2 border border-dashed border-gray-300 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <p className='fr-text--sm fr-mb-0 font-medium text-gray-900'>Point introuvable ?</p>
                <p className='fr-text--xs fr-mb-0 text-gray-600'>
                  Demandez l’ajout ou la correction des points de prélèvement du territoire.
                </p>
              </div>
              <DeclarationPointsChangeRequestAction
                buttonClassName='fr-btn fr-btn--tertiary fr-btn--sm fr-icon-add-circle-line fr-btn--icon-left shrink-0'
                buttonLabel='Demander la création de points'
                declaration={declaration}
                periodLabel={pointsChangePeriodLabel}
                status={pointsChangeStatus}
              />
            </div>
          )}

          <PointReconciliationMap
            activePointId={activePointId}
            canReconcile={canSubmitReconciliation}
            emptyMessage={mapEmptyMessage}
            focusRequestKey={focusRequestKey}
            hoveredPointId={hoveredPointId}
            isSubmitting={isSubmitting}
            matchedPointIds={matchedPointIds}
            pointConflictById={isAssociationMode ? localConflictByPointId : {}}
            points={visibleAvailablePoints}
            selectedChunk={selectedChunkWithIndex}
            showSelectedChunkUsage={!isAssociationMode}
            onFocusPoint={setActivePointId}
            onHoverPoint={setHoveredPointId}
            onReconcilePoint={canSubmitReconciliation ? handleReconcilePoint : undefined}
            onSelectConflictChunk={isAssociationMode ? handleSelectConflictChunk : undefined}
          />

          <MapPointsLegend
            mode={mapLegendMode}
            showMatchedPoints={showMatchedMapPoints}
            showUnmatchedPoints={showUnmatchedMapPoints}
            onToggleMatchedPoints={setShowMatchedMapPoints}
            onToggleUnmatchedPoints={setShowUnmatchedMapPoints}
          />
        </div>
      </div>
    </section>
  )
}

export default PointReconciliationPanel
