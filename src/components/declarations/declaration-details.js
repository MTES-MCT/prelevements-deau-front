'use client'

import {useEffect} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {CircularProgress} from '@mui/material'
import {useRouter} from 'next/navigation'

import PointReconciliationPanel from '@/components/declarations/point-reconciliation-panel.js'
import SourceDataDetails from '@/components/declarations/source-data-details.js'
import {isPointReconciliationRelevant, sourceStateLabels} from '@/lib/declaration.js'

const REFRESH_INTERVAL = 3000

function isTreatmentPending(source) {
  return source?.status === 'PENDING' || source?.status === 'PROCESSING'
}

function isTreatmentFailed(source) {
  return source?.status === 'FAILED'
}

function getSourceProcessingError(source) {
  return source?.declaration?.processingError || source?.metadata?.processingError || null
}

const ProcessingState = ({source}) => {
  const statusLabel = sourceStateLabels[source?.status] ?? sourceStateLabels.PROCESSING
  const hasFailed = isTreatmentFailed(source)
  const processingError = getSourceProcessingError(source)

  return (
    <div className='fr-mt-3w fr-mb-6w'>
      <Alert
        severity={statusLabel.severity}
        title={statusLabel.label}
        description={(
          <div className='flex flex-col gap-2'>
            <span>
              {hasFailed
                ? 'Le traitement automatique n’a pas abouti. Les fichiers déposés restent disponibles.'
                : 'Le retraitement de la déclaration est en cours. Les données seront réaffichées dès que l’orchestrateur aura terminé.'}
            </span>
            {hasFailed && processingError && (
              <span className='fr-text--sm fr-mb-0 text-red-700'>
                {processingError}
              </span>
            )}
            {!hasFailed && (
              <div className='flex items-center gap-2'>
                <CircularProgress aria-label='Traitement en cours' size={20} />
                <span>Actualisation automatique de la page.</span>
              </div>
            )}
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
  const hasFailed = isTreatmentFailed(source)
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

  let content = <SourceDataDetails declaration={declaration} source={source} />

  if (isPending || hasFailed) {
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
      {content}
    </div>
  )
}

export default DeclarationDetails
