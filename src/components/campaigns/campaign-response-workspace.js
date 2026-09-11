'use client'

import {
  Component, useEffect, useId, useMemo, useState
} from 'react'

import dynamic from 'next/dynamic'

import {campaignResponseMapPoints} from '@/lib/campaign-response-map.js'

const QuickDeclarationMap = dynamic(() => import('@/components/declarations/quick-declaration-map.js'), {ssr: false})
const emptyIds = []

class MapBoundary extends Component {
  state = {failed: false}

  static getDerivedStateFromError() {
    return {failed: true}
  }

  render() {
    return this.state.failed
      ? <p role='status' className='p-4 text-sm'>La carte n’est pas disponible sur cet appareil. Vous pouvez continuer à renseigner vos points dans la liste.</p>
      : this.props.children
  }
}

const CampaignResponseWorkspace = ({targets, children}) => {
  const id = useId()
  const [activeTargetId, setActiveTargetId] = useState(null)
  const [hoveredTargetId, setHoveredTargetId] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [wideScreen, setWideScreen] = useState(false)
  // Meter edits refresh targets without changing geometry. Keep the map's
  // points reference stable so an autosave never rebuilds its WebGL instance.
  const serializedPoints = useMemo(() => JSON.stringify(campaignResponseMapPoints(targets)), [targets])
  const points = useMemo(() => JSON.parse(serializedPoints), [serializedPoints])
  const pointDisplayNames = useMemo(() => Object.fromEntries(points.map(point => [point.id, point.name])), [points])
  const pointIds = useMemo(() => new Set(points.map(point => point.id)), [points])
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1280px)')
    const update = () => setWideScreen(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const focusPoint = targetId => {
    if (!pointIds.has(targetId)) {
      return
    }

    setActiveTargetId(targetId)
    const row = document.querySelector(`#${CSS.escape(`${id}-${targetId}`)}`)
    row?.scrollIntoView({block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'})
    const focusTarget = row?.querySelector('input:not(:disabled), textarea:not(:disabled)') || row
    focusTarget?.focus({preventScroll: true})
  }

  const pointProps = targetId => ({
    id: `${id}-${targetId}`,
    tabIndex: -1,
    onFocusCapture: () => setActiveTargetId(targetId),
    onMouseEnter: () => setHoveredTargetId(targetId),
    onMouseLeave: () => setHoveredTargetId(null),
    'data-active': activeTargetId === targetId || hoveredTargetId === targetId ? 'true' : undefined
  })

  if (points.length === 0) {
    return children({pointProps})
  }

  return (
    <div className='grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.68fr)] xl:items-start'>
      <div className='min-w-0'>
        <button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm mb-3 xl:hidden' aria-expanded={showMap} aria-controls={`${id}-map`} onClick={() => setShowMap(value => !value)}>{showMap ? 'Masquer la carte' : 'Afficher la carte des points'}</button>
        {children({pointProps})}
      </div>
      <aside id={`${id}-map`} aria-label='Carte des points de cette demande' className={`${showMap ? '' : 'hidden '}order-first min-w-0 rounded-sm border border-gray-200 bg-white xl:sticky xl:top-3 xl:order-none xl:block`}>
        <div className='border-b border-gray-200 px-3 py-2'>
          <h2 className='fr-mb-0 text-sm font-semibold'>Vos points concernés</h2>
          <p className='fr-mb-0 mt-1 text-xs text-gray-600'>Cliquez sur un point pour retrouver sa saisie.</p>
          {points.length < targets.length && <p className='fr-mb-0 mt-1 text-xs text-gray-600'>{targets.length - points.length} point{targets.length - points.length > 1 ? 's' : ''} sans localisation reste{targets.length - points.length > 1 ? 'nt' : ''} accessible{targets.length - points.length > 1 ? 's' : ''} dans la liste.</p>}
        </div>
        <div className='h-[250px] md:h-[320px] xl:h-[min(680px,calc(100vh-8rem))]'>
          {(wideScreen || showMap) && <MapBoundary>
            <QuickDeclarationMap points={points} pointDisplayNames={pointDisplayNames} activePointId={activeTargetId} hoveredPointId={hoveredTargetId} selectedPointIds={emptyIds} declaredPointIds={emptyIds} onFocusPoint={focusPoint} onHoverPoint={setHoveredTargetId} />
          </MapBoundary>}
        </div>
      </aside>
    </div>
  )
}

export default CampaignResponseWorkspace
