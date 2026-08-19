'use client'

import {
  memo, useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import {useVirtualizer} from '@tanstack/react-virtual'

import {getPointFlowType, getPointFlowTypeColors, getPointFlowTypeLabel} from '@/lib/point-flow-types.js'
import {
  MISSING_USAGE_KEY,
  WATER_BODY_TYPE_LABELS,
  getPointUsageRootKeys
} from '@/lib/points-prelevement-filters.js'
import {SEARCH_SORT_MODES} from '@/lib/smart-search.js'
import {getUsageColor, getUsageLabel} from '@/lib/water-uses.js'
import {
  getPointPrelevementDisplayName,
  getPointPrelevementTechnicalReference
} from '@/utils/point-prelevement.js'

const collator = new Intl.Collator('fr-FR', {numeric: true, sensitivity: 'base'})
const MISSING_USAGE_COLOR = '#929292'

const getUsageColorFromKey = usageKey => usageKey === MISSING_USAGE_KEY
  ? MISSING_USAGE_COLOR
  : getUsageColor(usageKey)

const getUsageMarkerBackground = usageKeys => {
  const colors = usageKeys.map(usageKey => getUsageColorFromKey(usageKey))
  if (colors.length <= 1) {
    return colors[0] ?? MISSING_USAGE_COLOR
  }

  const segmentSize = 100 / colors.length
  const segments = colors.map((color, index) =>
    `${color} ${index * segmentSize}% ${(index + 1) * segmentSize}%`)

  return `conic-gradient(${segments.join(', ')})`
}

const getUsageSummary = usageKeys => {
  const labels = usageKeys.map(usageKey => usageKey === MISSING_USAGE_KEY
    ? 'Usage non renseigné'
    : getUsageLabel(usageKey))

  if (labels.length <= 2) {
    return labels.join(' · ')
  }

  return `${labels.slice(0, 2).join(' · ')} + ${labels.length - 2}`
}

const PointListItem = memo(({
  highlighted,
  listIndex,
  point,
  preferUsageName,
  tabIndex,
  onKeyDown,
  onPointFocus,
  onPointHover,
  onPointSelect
}) => {
  const focusedRef = useRef(false)
  const hoveredRef = useRef(false)
  const displayName = getPointPrelevementDisplayName(point, {
    fallback: 'Point de prélèvement',
    preferUsageName
  })
  const technicalReference = getPointPrelevementTechnicalReference(point, {preferUsageName})
  const alternateName = preferUsageName
    ? technicalReference
    : (point.usageName && point.usageName !== displayName ? point.usageName : null)
  const alternateNameLabel = preferUsageName ? 'Nom technique' : 'Nom d’usage'
  const flowType = getPointFlowType(point)
  const flowTypeColors = getPointFlowTypeColors(flowType)
  const usageKeys = getPointUsageRootKeys(point)
  const waterBodyTypeLabel = WATER_BODY_TYPE_LABELS[point.waterBodyType]
    ?? point.waterBodyType
    ?? 'Milieu non renseigné'

  return (
    <button
      className={`group block w-full cursor-pointer border-0 border-b border-gray-200 px-4 py-3 text-left text-inherit transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#000091] ${highlighted ? 'bg-[#ececfe] shadow-[inset_0_0_0_2px_#000091]' : 'bg-white hover:bg-[#f6f6fe]'}`}
      data-highlighted={highlighted || undefined}
      data-point-list-index={listIndex}
      tabIndex={tabIndex}
      aria-keyshortcuts='ArrowUp ArrowDown PageUp PageDown Home End'
      type='button'
      onBlur={() => {
        focusedRef.current = false
        if (!hoveredRef.current) {
          onPointHover(null)
        }
      }}
      onFocus={() => {
        focusedRef.current = true
        onPointFocus(listIndex)
        onPointHover(point.id)
      }}
      onMouseEnter={() => {
        hoveredRef.current = true
        onPointHover(point.id)
      }}
      onMouseLeave={() => {
        hoveredRef.current = false
        if (!focusedRef.current) {
          onPointHover(null)
        }
      }}
      onKeyDown={event => onKeyDown(event, listIndex)}
      onClick={() => onPointSelect(point)}
    >
      <div className='min-w-0'>
        <div className='flex items-start justify-between gap-2'>
          <h3 className={`fr-text--sm fr-mb-0 min-w-0 break-words font-semibold leading-5 ${highlighted ? 'text-[#000091]' : 'text-gray-900 group-hover:text-[#000091]'}`}>
            {displayName}
          </h3>
          <span
            className='inline-flex shrink-0 border px-1.5 py-0.5 text-[0.625rem] font-semibold leading-[0.875rem]'
            style={{
              backgroundColor: flowTypeColors.backgroundColor,
              borderColor: flowTypeColors.borderColor,
              color: flowTypeColors.textColor
            }}
          >
            {getPointFlowTypeLabel(flowType)}
          </span>
        </div>

        {alternateName && (
          <p className='fr-mb-0 mt-1 break-words text-xs text-gray-600'>
            {alternateNameLabel} : {alternateName}
          </p>
        )}

        <div className='mt-2 flex flex-wrap items-center gap-1.5 text-[0.6875rem] leading-4 text-gray-600'>
          <span className='inline-flex bg-gray-100 px-1.5 py-0.5'>
            {waterBodyTypeLabel}
          </span>
          <span className='inline-flex min-w-0 items-center gap-1.5 break-words'>
            <span
              aria-hidden='true'
              className='h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-gray-300'
              style={{background: getUsageMarkerBackground(usageKeys)}}
            />
            <span>
              {getUsageSummary(usageKeys)}
            </span>
          </span>
        </div>
      </div>
    </button>
  )
})

const PointsMapList = memo(({
  highlightedPointId,
  isLoading,
  onClose,
  points,
  preferUsageName,
  hasSearchQuery,
  searchScores,
  scrollHighlightedPointIntoView,
  sortMode,
  onPointHover,
  onPointSelect
}) => {
  const scrollContainerRef = useRef(null)
  const pendingFocusIndexRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const sortedPoints = useMemo(() => [...points].sort((left, right) => {
    if (hasSearchQuery && sortMode === SEARCH_SORT_MODES.RELEVANCE) {
      const scoreDifference = (searchScores?.get(right.id) ?? 0) - (searchScores?.get(left.id) ?? 0)
      if (scoreDifference !== 0) {
        return scoreDifference
      }
    }

    return collator.compare(
      getPointPrelevementDisplayName(left, {preferUsageName}),
      getPointPrelevementDisplayName(right, {preferUsageName})
    ) || collator.compare(left.id, right.id)
  }), [hasSearchQuery, points, preferUsageName, searchScores, sortMode])
  const pointIndexesById = useMemo(
    () => new Map(sortedPoints.map((point, index) => [point.id, index])),
    [sortedPoints]
  )
  const rowVirtualizer = useVirtualizer({
    count: isLoading ? 0 : sortedPoints.length,
    estimateSize: () => 96,
    getItemKey: index => sortedPoints[index]?.id ?? index,
    getScrollElement: () => scrollContainerRef.current,
    overscan: 8
  })
  const virtualItems = rowVirtualizer.getVirtualItems()
  const firstVirtualIndex = virtualItems[0]?.index
  const lastVirtualIndex = virtualItems.at(-1)?.index

  const focusPointAtIndex = useCallback(index => {
    if (sortedPoints.length === 0) {
      return
    }

    const targetIndex = Math.max(0, Math.min(index, sortedPoints.length - 1))
    pendingFocusIndexRef.current = targetIndex
    setActiveIndex(targetIndex)
    rowVirtualizer.scrollToIndex(targetIndex, {align: 'auto'})
  }, [rowVirtualizer, sortedPoints.length])

  useEffect(() => {
    const targetIndex = pendingFocusIndexRef.current
    if (targetIndex === null) {
      return
    }

    const target = scrollContainerRef.current
      ?.querySelector(`[data-point-list-index="${targetIndex}"]`)
    if (target) {
      pendingFocusIndexRef.current = null
      target.focus()
    }
  }, [activeIndex, firstVirtualIndex, lastVirtualIndex])

  useEffect(() => {
    if (sortedPoints.length === 0) {
      pendingFocusIndexRef.current = null
      setActiveIndex(0)
      return
    }

    setActiveIndex(currentIndex => Math.min(currentIndex, sortedPoints.length - 1))
  }, [sortedPoints.length])

  const handlePointKeyDown = useCallback((event, index) => {
    let targetIndex
    switch (event.key) {
      case 'ArrowDown': {
        targetIndex = index + 1
        break
      }

      case 'ArrowUp': {
        targetIndex = index - 1
        break
      }

      case 'PageDown': {
        const visibleRows = Math.max(1, Math.floor(
          (scrollContainerRef.current?.clientHeight ?? 96) / 96
        ))
        targetIndex = index + visibleRows
        break
      }

      case 'PageUp': {
        const visibleRows = Math.max(1, Math.floor(
          (scrollContainerRef.current?.clientHeight ?? 96) / 96
        ))
        targetIndex = index - visibleRows
        break
      }

      case 'Home': {
        targetIndex = 0
        break
      }

      case 'End': {
        targetIndex = sortedPoints.length - 1
        break
      }

      default: {
        return
      }
    }

    event.preventDefault()
    focusPointAtIndex(targetIndex)
  }, [focusPointAtIndex, sortedPoints.length])

  const handlePointFocus = useCallback(index => {
    setActiveIndex(index)
  }, [])

  useEffect(() => {
    if (!scrollHighlightedPointIntoView || !highlightedPointId) {
      return
    }

    const pointIndex = pointIndexesById.get(highlightedPointId)
    if (pointIndex !== undefined) {
      rowVirtualizer.scrollToIndex(pointIndex, {align: 'auto'})
    }
  }, [highlightedPointId, pointIndexesById, rowVirtualizer, scrollHighlightedPointIntoView])

  return (
    <div className='flex h-full min-h-0 flex-col bg-white'>
      <div className='flex h-11 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4'>
        <h2 className='fr-text--sm fr-mb-0 font-semibold'>Liste des points</h2>
        {onClose && (
          <button
            aria-label='Masquer la liste des points'
            className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-left-s-line'
            title='Masquer la liste'
            type='button'
            onClick={onClose}
          />
        )}
      </div>

      <div ref={scrollContainerRef} className='min-h-0 flex-1 overflow-y-auto'>
        {isLoading && (
          <div className='flex h-full items-center justify-center p-6 text-center text-sm text-gray-600' role='status'>
            Chargement des points…
          </div>
        )}

        {!isLoading && sortedPoints.length === 0 && (
          <div className='flex h-full items-center justify-center p-6 text-center text-sm text-gray-600'>
            Aucun point ne correspond aux filtres sélectionnés.
          </div>
        )}

        {!isLoading && sortedPoints.length > 0 && (
          <div
            aria-label='Points de prélèvement'
            className='relative w-full'
            role='list'
            style={{height: `${rowVirtualizer.getTotalSize()}px`}}
          >
            {virtualItems.map(virtualItem => {
              const point = sortedPoints[virtualItem.index]

              return (
                <div
                  key={virtualItem.key}
                  ref={rowVirtualizer.measureElement}
                  className='absolute left-0 top-0 w-full'
                  data-index={virtualItem.index}
                  role='listitem'
                  aria-posinset={virtualItem.index + 1}
                  aria-setsize={sortedPoints.length}
                  style={{transform: `translateY(${virtualItem.start}px)`}}
                >
                  <PointListItem
                    highlighted={highlightedPointId === point.id}
                    listIndex={virtualItem.index}
                    point={point}
                    preferUsageName={preferUsageName}
                    tabIndex={activeIndex === virtualItem.index ? 0 : -1}
                    onKeyDown={handlePointKeyDown}
                    onPointFocus={handlePointFocus}
                    onPointHover={onPointHover}
                    onPointSelect={onPointSelect}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})

export default PointsMapList
