'use client'

import {
  useEffect,
  useRef,
  useState
} from 'react'

import SeriesExplorer from '@/components/points-prelevement/series-explorer.js'
import DeferredRender from '@/components/ui/deferred-render.js'
import {getAggregatedSeriesOptionsAction} from '@/server/actions/series.js'

const SeriesOptionsLoadingState = () => (
  <div className='flex min-h-[240px] items-center justify-center bg-gray-100 text-center' role='status'>
    Chargement des séries…
  </div>
)

const SeriesOptionsDataLoader = ({
  collecteurId,
  pointIds,
  preleveurId,
  ...seriesProps
}) => {
  const requestIdRef = useRef(0)
  const [seriesOptions, setSeriesOptions] = useState(null)
  const [error, setError] = useState(null)
  const pointIdsKey = Array.isArray(pointIds) ? pointIds.join(',') : ''

  useEffect(() => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const requestedPointIds = pointIdsKey ? pointIdsKey.split(',') : undefined
    setError(null)
    setSeriesOptions(null)

    async function loadOptions() {
      let result

      try {
        result = await getAggregatedSeriesOptionsAction({
          collecteurId,
          pointIds: requestedPointIds,
          preleveurId
        })
      } catch {
        result = {success: false}
      }

      if (requestIdRef.current !== requestId) {
        return
      }

      if (result.success) {
        setSeriesOptions(result.data)
      } else {
        setError(result.error || 'Impossible de charger les options de séries.')
      }
    }

    loadOptions()

    return () => {
      if (requestIdRef.current === requestId) {
        requestIdRef.current += 1
      }
    }
  }, [collecteurId, pointIdsKey, preleveurId])

  if (error) {
    return (
      <div className='fr-alert fr-alert--error fr-alert--sm' role='alert'>
        <p>{error}</p>
      </div>
    )
  }

  if (!seriesOptions) {
    return <SeriesOptionsLoadingState />
  }

  return (
    <SeriesExplorer
      {...seriesProps}
      collecteurId={collecteurId}
      pointIds={pointIds}
      preleveurId={preleveurId}
      seriesOptions={seriesOptions}
    />
  )
}

const SeriesOptionsLoader = props => (
  <DeferredRender
    minHeight={240}
    placeholder={<SeriesOptionsLoadingState />}
    rootMargin='400px 0px'
  >
    <SeriesOptionsDataLoader {...props} />
  </DeferredRender>
)

export default SeriesOptionsLoader
