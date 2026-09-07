'use client'

import {
  memo, useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import {useVirtualizer} from '@tanstack/react-virtual'

import PointSummaryTiles from '@/components/points-prelevement/point-summary-tiles.js'
import {createPointListPresentation} from '@/lib/point-list-presentation.js'
import {SEARCH_SORT_MODES} from '@/lib/smart-search.js'
import {keepActiveIndexInRenderedRange} from '@/lib/virtualized-list.js'
import {getPointPrelevementDisplayName} from '@/utils/point-prelevement.js'

const collator = new Intl.Collator('fr-FR', {numeric: true, sensitivity: 'base'})
const ESTIMATED_ROW_HEIGHT = 88

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
  const presentation = createPointListPresentation(point)

  return (
    <button
      className={`group block w-full cursor-pointer border-0 px-3 py-2 text-left text-inherit transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#000091] ${highlighted ? 'bg-[#ececfe] shadow-[inset_0_0_0_2px_#000091]' : 'bg-white hover:bg-[#f6f6fe]'}`}
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
        <h3 className={`fr-text--sm fr-mb-0 min-w-0 break-words font-semibold leading-5 ${highlighted ? 'text-[#000091]' : 'text-gray-900 group-hover:text-[#000091]'}`}>
          {displayName}
        </h3>

        <div className='mt-2'>
          <PointSummaryTiles presentation={presentation} />
        </div>

        {presentation.preleveurLabels.length > 0 && (
          <div className='mt-1.5 space-y-0.5 text-[0.6875rem] leading-4 text-gray-600'>
            {presentation.preleveurLabels.map(label => (
              <span
                key={label}
                className='block min-w-0 break-words'
                title={`Préleveur : ${label}`}
              >
                <span className='sr-only'>Préleveur : </span>
                {label}
              </span>
            ))}
          </div>
        )}
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
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
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
    if (pendingFocusIndexRef.current !== null) {
      return
    }

    setActiveIndex(currentIndex => keepActiveIndexInRenderedRange(
      currentIndex,
      firstVirtualIndex,
      lastVirtualIndex
    ))
  }, [firstVirtualIndex, lastVirtualIndex])

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
          (scrollContainerRef.current?.clientHeight ?? ESTIMATED_ROW_HEIGHT) / ESTIMATED_ROW_HEIGHT
        ))
        targetIndex = index + visibleRows
        break
      }

      case 'PageUp': {
        const visibleRows = Math.max(1, Math.floor(
          (scrollContainerRef.current?.clientHeight ?? ESTIMATED_ROW_HEIGHT) / ESTIMATED_ROW_HEIGHT
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
                  className='absolute left-0 top-0 w-full border-b border-solid border-[#cecece]'
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
