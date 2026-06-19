'use client'

import PointReconciliationPanel from '@/components/declarations/point-reconciliation-panel.js'
import SourceDataDetails from '@/components/declarations/source-data-details.js'
import {isPointReconciliationRelevant} from '@/lib/declaration.js'
import {formatNumber} from '@/utils/number.js'

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

const DeclarationDetails = ({
  availablePoints = [],
  declaration,
  isInstructor,
  onDeclarationChange,
  source
}) => {
  const showReconciliation = isPointReconciliationRelevant(declaration, source)

  return (
    <div className='fr-mb-4w'>
      <VolumeSummary metadata={source?.metadata} />

      {showReconciliation ? (
        <PointReconciliationPanel
          availablePoints={availablePoints}
          canReconcile={!isInstructor}
          declaration={declaration}
          source={source}
          onDeclarationChange={onDeclarationChange}
        />
      ) : (
        <SourceDataDetails source={source} />
      )}
    </div>
  )
}

export default DeclarationDetails
