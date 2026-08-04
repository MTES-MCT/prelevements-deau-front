'use client'

import dynamic from 'next/dynamic'

import DeferredRender from '@/components/ui/deferred-render.js'

const MapLoadingState = () => (
  <div
    className='flex h-full min-h-[240px] w-full items-center justify-center bg-gray-100 text-center'
    role='status'
  >
    <span className='fr-icon-map-pin-2-line fr-mr-1w' aria-hidden='true' />
    <span>Chargement de la carte…</span>
  </div>
)

const DynamicMap = dynamic(
  () => import('./map-view.js'),
  {
    loading: MapLoadingState,
    ssr: false
  }
)

const DeferredMap = props => (
  <DeferredRender
    className='h-full w-full'
    minHeight='100%'
    placeholder={<MapLoadingState />}
    rootMargin='300px 0px'
  >
    <DynamicMap {...props} />
  </DeferredRender>
)

export default DeferredMap
