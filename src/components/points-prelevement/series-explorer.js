'use client'

import dynamic from 'next/dynamic'

import DeferredRender from '@/components/ui/deferred-render.js'

const SeriesLoadingState = () => (
  <div
    className='flex min-h-[240px] items-center justify-center border border-gray-200 bg-white p-6 text-center'
    role='status'
  >
    <span className='fr-icon-refresh-line fr-icon--spin fr-mr-1w' aria-hidden='true' />
    <span>Chargement de la visualisation…</span>
  </div>
)

const DynamicSeriesExplorer = dynamic(
  () => import('./series-explorer-content.js'),
  {
    loading: SeriesLoadingState,
    ssr: false
  }
)

const SeriesExplorer = props => (
  <DeferredRender
    minHeight={240}
    placeholder={<SeriesLoadingState />}
    rootMargin='400px 0px'
  >
    <DynamicSeriesExplorer {...props} />
  </DeferredRender>
)

export default SeriesExplorer
