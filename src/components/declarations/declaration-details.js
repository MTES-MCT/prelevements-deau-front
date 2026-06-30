'use client'

import {useEffect} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {CircularProgress} from '@mui/material'
import {useRouter} from 'next/navigation'

import PointReconciliationPanel from '@/components/declarations/point-reconciliation-panel.js'
import SourceDataDetails from '@/components/declarations/source-data-details.js'
import {isPointReconciliationRelevant, sourceStateLabels} from '@/lib/declaration.js'
import {formatNumber} from '@/utils/number.js'

const REFRESH_INTERVAL = 3000

function isTreatmentPending(source) {
  return source?.status === 'PENDING' || source?.status === 'PROCESSING'
}

const VolumeSummary = ({metadata}) => {
  const totalWaterVolumeWithdrawn = metadata?.totalWaterVolumeWithdrawn
  const totalWaterVolumeDischarged = metadata?.totalWaterVolumeDischarged

  if (!totalWaterVolumeWithdrawn && !totalWaterVolumeDischarged) {
    return null
  }

  return (
    <div className='fr-mb-2w flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700'>
      {totalWaterVolumeWithdrawn > 0 && (
        <p className='fr-mb-0'>
          Volume prélevé : <strong>{formatNumber(totalWaterVolumeWithdrawn)} m³</strong>
        </p>
      )}

      {totalWaterVolumeDischarged > 0 && (
        <p className='fr-mb-0'>
          Volume rejeté : <strong>{formatNumber(totalWaterVolumeDischarged)} m³</strong>
        </p>
      )}
    </div>
  )
}

const ProcessingState = ({source}) => {
  const statusLabel = sourceStateLabels[source?.status] ?? sourceStateLabels.PROCESSING

  return (
    <div className='fr-mt-3w fr-mb-6w'>
      <Alert
        severity={statusLabel.severity}
        title={statusLabel.label}
        description={(
          <div className='flex flex-col gap-2'>
            <span>
              Le retraitement de la déclaration est en cours. Les données seront réaffichées dès que l’orchestrateur aura terminé.
            </span>
            <div className='flex items-center gap-2'>
              <CircularProgress aria-label='Traitement en cours' size={20} />
              <span>Actualisation automatique de la page.</span>
            </div>
          </div>
        )}
      />
    </div>
  )
}

const DeclarationDetails = ({
  availablePoints = [],
  canReconcile,
  declaration,
  isInstructor,
  onDeclarationChange,
  source
}) => {
  const router = useRouter()
  const showReconciliation = isPointReconciliationRelevant(declaration, source)
  const isPending = isTreatmentPending(source)
  const canReconcilePoints = typeof canReconcile === 'boolean'
    ? canReconcile
    : !isInstructor

  useEffect(() => {
    if (!isPending) {
      return undefined
    }

    const interval = setInterval(() => {
      router.refresh()
    }, REFRESH_INTERVAL)

    return () => {
      clearInterval(interval)
    }
  }, [isPending, router, source?.id, source?.status])

  let content = <SourceDataDetails source={source} />

  if (isPending) {
    content = <ProcessingState source={source} />
  } else if (showReconciliation) {
    content = (
      <PointReconciliationPanel
        availablePoints={availablePoints}
        canReconcile={canReconcilePoints}
        declaration={declaration}
        source={source}
        onDeclarationChange={onDeclarationChange}
      />
    )
  }

  return (
    <div className='fr-mb-4w'>
      <VolumeSummary metadata={source?.metadata} />
      {content}
    </div>
  )
}

export default DeclarationDetails
