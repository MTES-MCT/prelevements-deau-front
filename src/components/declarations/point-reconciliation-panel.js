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
import Badge from '@codegouvfr/react-dsfr/Badge'

import PointReconciliationMap from '@/components/declarations/point-reconciliation-map.js'
import {formatDateRange} from '@/lib/format-date.js'
import {
  formatUsageReference,
  getUsageColor,
  getUsageReferenceLabel,
  getUsageTextColor
} from '@/lib/water-uses.js'
import {reconcileDeclarationChunkAction} from '@/server/actions/declarations.js'
import {formatNumber} from '@/utils/number.js'

const CHUNK_LIST_SCROLL_FACTOR = 1.8

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

function getRawPointName(chunk) {
  return chunk?.pointPrelevementName || 'Nom non identifié'
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

function getSummaryTitle({remainingCount}) {
  return remainingCount === 0
    ? 'Tous les points sont associés'
    : 'Points à associer'
}

function getSummaryDescription({remainingCount, totalCount}) {
  if (totalCount === 0) {
    return 'Aucun point n’a été détecté dans ce fichier.'
  }

  if (remainingCount === 0) {
    return `${totalCount} point${totalCount > 1 ? 's' : ''} détecté${totalCount > 1 ? 's' : ''} et associé${totalCount > 1 ? 's' : ''}.`
  }

  return `${remainingCount} point${remainingCount > 1 ? 's' : ''} sur ${totalCount} reste${remainingCount > 1 ? 'nt' : ''} à associer.`
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
  <Badge severity={matched ? 'success' : 'warning'}>
    {matched ? 'Associé' : 'À associer'}
  </Badge>
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
  const baseClassName = 'w-full border border-l-4 p-3 text-left transition-colors'

  if (isSelected) {
    return `${baseClassName} border-[#000091] border-l-[#000091] bg-[#f5f5fe] shadow-sm`
  }

  if (matched) {
    return `${baseClassName} border-gray-300 border-l-[#18753c] bg-white hover:bg-gray-50`
  }

  return `${baseClassName} border-gray-300 border-l-[#ce614a] bg-white hover:bg-gray-50`
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
    getAssociationLabel({chunk, isSelected: false}),
    getUsageReferenceLabel(chunk.usage),
    formatUsageReference(chunk.usage)
  ].join(' '))
}

function getPointSearchText(point) {
  return normalizeSearchValue([
    point?.name,
    ...(point?.pointPrelevementNameAliases ?? []),
    point?.waterBodyType,
    point?.nature,
    point?.withdrawalType
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

const ChunkListItem = ({
  canDetach = false,
  chunk,
  feedbackMessage = null,
  index,
  itemRef,
  isSelected,
  isSubmitting = false,
  onDetach,
  onSelect
}) => {
  const matched = isChunkMatched(chunk)
  const chunkTitle = getChunkTitle(chunk, index)
  const volumeLabel = getChunkVolumeLabel(chunk)
  const usageLabel = formatUsageReference(chunk.usage)

  return (
    <div ref={itemRef} className={getChunkItemClassName({isSelected, matched})}>
      <div className='flex items-start justify-between gap-3'>
        <button
          type='button'
          className='min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-left'
          aria-pressed={isSelected}
          onClick={onSelect}
        >
          <div className='flex flex-wrap items-center gap-2'>
            <span className='truncate text-sm font-bold text-gray-900' title={chunkTitle}>
              {chunkTitle}
            </span>
            {isSelected && (
              <span className='text-xs font-medium text-[#000091]'>
                Sélectionné
              </span>
            )}
          </div>
          <div
            className={matched ? 'truncate text-xs text-[#18753c]' : 'truncate text-xs text-gray-500'}
            title={matched ? getChunkPointName(chunk) : undefined}
          >
            {getAssociationLabel({chunk, isSelected})}
          </div>

          {usageLabel && <UsageReference label={usageLabel} usage={chunk.usage} />}

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
        </button>

        <div className='flex shrink-0 flex-col items-end gap-2'>
          <ChunkStatusBadge matched={matched} />
          {canDetach && (
            <button
              type='button'
              className='fr-btn fr-btn--secondary fr-btn--sm'
              disabled={isSubmitting}
              onClick={onDetach}
            >
              Détacher
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

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
  const firstUnmatchedChunkId = useMemo(
    () => chunks.find(chunk => !isChunkMatched(chunk))?.id ?? chunks[0]?.id ?? null,
    [chunks]
  )
  const [selectedChunkId, setSelectedChunkId] = useState(firstUnmatchedChunkId)
  const [activePointId, setActivePointId] = useState(null)
  const [focusRequestKey, setFocusRequestKey] = useState(0)
  const [hoveredPointId, setHoveredPointId] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [chunkSearch, setChunkSearch] = useState('')
  const [pointSearch, setPointSearch] = useState('')
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false)

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
    }
  }, [chunks, firstUnmatchedChunkId, selectedChunkId])

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

  const remainingCount = chunks.filter(chunk => !isChunkMatched(chunk)).length
  const totalCount = chunks.length
  const summarySeverity = getSummarySeverity({remainingCount, totalCount})
  const canSubmitReconciliation = canReconcile && Boolean(selectedChunk)
  const nextUnmatchedChunk = useMemo(
    () => getNextUnmatchedChunk(chunks, selectedChunkId),
    [chunks, selectedChunkId]
  )
  const localConflictByPointId = useMemo(
    () => getLocalConflictByPointId(chunks, selectedChunk),
    [chunks, selectedChunk]
  )
  const normalizedChunkSearch = normalizeSearchValue(chunkSearch)
  const filteredChunkItems = useMemo(() => chunks
    .map((chunk, index) => ({chunk, index}))
    .filter(({chunk, index}) => {
      if (showOnlyUnmatched && isChunkMatched(chunk)) {
        return false
      }

      if (!normalizedChunkSearch) {
        return true
      }

      return getChunkSearchText(chunk, index).includes(normalizedChunkSearch)
    }), [chunks, normalizedChunkSearch, showOnlyUnmatched])
  const normalizedPointSearch = normalizeSearchValue(pointSearch)
  const filteredAvailablePoints = useMemo(() => {
    if (!normalizedPointSearch) {
      return availablePoints
    }

    return availablePoints.filter(point => getPointSearchText(point).includes(normalizedPointSearch))
  }, [availablePoints, normalizedPointSearch])

  useEffect(() => {
    if (!activePointId) {
      return
    }

    if (!filteredAvailablePoints.some(point => point.id === activePointId)) {
      setActivePointId(null)
    }
  }, [activePointId, filteredAvailablePoints])

  const handleSelectNextUnmatchedChunk = useCallback(() => {
    if (nextUnmatchedChunk) {
      handleSelectChunk(nextUnmatchedChunk)
    }
  }, [handleSelectChunk, nextUnmatchedChunk])

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
    if (showOnlyUnmatched && selectedChunk && isChunkMatched(selectedChunk) && nextUnmatchedChunk) {
      handleSelectChunk(nextUnmatchedChunk)
    }
  }, [handleSelectChunk, nextUnmatchedChunk, selectedChunk, showOnlyUnmatched])

  const updateSelectedChunkAssociation = useCallback(({globalInstructionStatus, point}) => {
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
            pointPrelevement: point ?? null
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
        point
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
    if (!canReconcile || !selectedChunk?.pointPrelevementId) {
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
        point: null
      })
      setActivePointId(null)
      setSubmitSuccess('Association retirée')
    } finally {
      setIsSubmitting(false)
    }
  }, [canReconcile, declaration.id, isSubmitting, selectedChunk, updateSelectedChunkAssociation])

  if (totalCount === 0) {
    return (
      <Alert
        severity='info'
        title='Aucun point détecté'
        description='Le traitement du fichier n’a pas produit de point à associer.'
      />
    )
  }

  return (
    <section className='fr-mb-4w border border-gray-200 bg-white p-5 md:p-6'>
      <div className='mb-4'>
        <h2 className='fr-h4 fr-mb-1v'>Association des points</h2>
      </div>

      <Alert
        severity={summarySeverity}
        title={getSummaryTitle({remainingCount})}
        description={getSummaryDescription({remainingCount, totalCount})}
      />

      {submitError && (
        <Alert
          className='fr-mt-2w'
          severity='error'
          title='Association impossible'
          description={submitError}
        />
      )}

      <div className='fr-mt-3w grid gap-4 lg:grid-cols-[minmax(280px,420px)_1fr]'>
        <div>
          <div className='mb-2 flex items-center justify-between gap-2'>
            <h2 className='fr-h6 fr-mb-0'>Lignes importées</h2>
            <button
              type='button'
              className='fr-btn fr-btn--secondary fr-btn--sm'
              disabled={!nextUnmatchedChunk}
              onClick={handleSelectNextUnmatchedChunk}
            >
              Suivant à associer
            </button>
          </div>

          <div className='mb-2 flex flex-col gap-2'>
            <input
              type='search'
              className='fr-input'
              aria-label='Rechercher une ligne importée'
              placeholder='Rechercher une ligne'
              value={chunkSearch}
              onChange={event => setChunkSearch(event.target.value)}
            />

            <div className='flex items-center justify-between gap-3'>
              <div className='fr-checkbox-group fr-mb-0'>
                <input
                  id={unmatchedOnlyInputId}
                  type='checkbox'
                  checked={showOnlyUnmatched}
                  onChange={event => setShowOnlyUnmatched(event.target.checked)}
                />
                <label className='fr-label' htmlFor={unmatchedOnlyInputId}>
                  À associer uniquement
                </label>
              </div>
              <span className='shrink-0 text-sm text-gray-600'>
                {filteredChunkItems.length}/{totalCount}
              </span>
            </div>
          </div>

          <div
            className='max-h-[min(70vh,720px)] space-y-2 overflow-y-auto pr-1'
            onWheel={handleChunkListWheel}
          >
            {filteredChunkItems.length === 0 ? (
              <div className='border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-600'>
                Aucune ligne.
              </div>
            ) : (
              filteredChunkItems.map(({chunk, index}) => (
                <ChunkListItem
                  key={chunk.id}
                  canDetach={
                    canReconcile
                    && chunk.id === selectedChunkId
                    && Boolean(chunk.pointPrelevementId)
                  }
                  chunk={chunk}
                  feedbackMessage={chunk.id === selectedChunkId ? submitSuccess : null}
                  index={index}
                  itemRef={chunk.id === selectedChunkId ? selectedChunkItemRef : undefined}
                  isSubmitting={isSubmitting}
                  isSelected={chunk.id === selectedChunkId}
                  onDetach={handleDetachPoint}
                  onSelect={() => handleSelectChunk(chunk)}
                />
              ))
            )}
          </div>
        </div>

        <div className='min-h-0'>
          <div className='mb-2 flex items-center justify-between gap-2'>
            <h2 className='fr-h6 fr-mb-0'>Points de prélèvement du déclarant</h2>
            <span className='text-sm text-gray-600'>
              {filteredAvailablePoints.length}/{availablePoints.length}
            </span>
          </div>

          <input
            type='search'
            className='fr-input fr-mb-2w'
            aria-label='Rechercher un point de prélèvement'
            placeholder='Rechercher un point'
            value={pointSearch}
            onChange={event => setPointSearch(event.target.value)}
          />

          <PointReconciliationMap
            activePointId={activePointId}
            canReconcile={canSubmitReconciliation}
            emptyMessage={
              normalizedPointSearch && filteredAvailablePoints.length === 0
                ? 'Aucun point ne correspond à la recherche.'
                : undefined
            }
            focusRequestKey={focusRequestKey}
            hoveredPointId={hoveredPointId}
            isSubmitting={isSubmitting}
            matchedPointIds={matchedPointIds}
            pointConflictById={localConflictByPointId}
            points={filteredAvailablePoints}
            selectedChunk={selectedChunkWithIndex}
            onFocusPoint={setActivePointId}
            onHoverPoint={setHoveredPointId}
            onReconcilePoint={handleReconcilePoint}
            onSelectConflictChunk={handleSelectConflictChunk}
          />
        </div>
      </div>
    </section>
  )
}

export default PointReconciliationPanel
