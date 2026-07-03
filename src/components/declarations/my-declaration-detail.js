'use client'

import {useEffect, useMemo, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {CircularProgress} from '@mui/material'

import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationOverview from '@/components/declarations/declaration-overview.js'
import DeclarationPointsChangeRequestAction from '@/components/declarations/declaration-points-change-request-action.js'
import {
  getDeclarationDisplayStatus,
  getSourceReadingDateLabel,
  getSourcePeriodLabel,
  isDeclarationTreatmentPending,
  sourceStateLabels
} from '@/lib/declaration.js'
import {getDeclarationAction} from '@/server/actions/declarations.js'

const REFRESH_INTERVAL = 3000

function formatProcessingEventDate(value) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}

const ProcessingLoader = () => (
  <div className='flex items-center gap-2'>
    <CircularProgress aria-label='Traitement en cours' size={20} />
    <span>Traitement de la déclaration en cours.</span>
  </div>
)

const ProcessingState = ({declaration}) => {
  const source = declaration?.source
  const displayStatus = getDeclarationDisplayStatus(declaration, source)
  const statusLabel = sourceStateLabels[displayStatus] ?? sourceStateLabels.PROCESSING
  const isPending = isDeclarationTreatmentPending(declaration, source)
  const latestEvent = declaration?.processingEvents?.[0]
  const latestEventDate = formatProcessingEventDate(latestEvent?.createdAt)
  const processingError = declaration?.processingError || latestEvent?.message
  const hasProcessingFailed = source?.status === 'FAILED' || declaration?.processingStatus === 'FAILED'

  return (
    <div className='fr-mb-6w'>
      <Alert
        severity={statusLabel.severity}
        title={statusLabel.label}
        description={
          <div className='flex flex-col gap-2'>
            <span>
              {hasProcessingFailed
                ? 'Le traitement automatique n’a pas abouti. Les fichiers déposés restent disponibles ci-dessous.'
                : 'Les fichiers ont bien été déposés. Le traitement peut prendre quelques minutes pour les fichiers volumineux.'}
            </span>

            {processingError && displayStatus === 'FAILED' && (
              <span className='fr-text--sm fr-mb-0 text-red-700'>
                {processingError}
              </span>
            )}

            {latestEvent && (
              <span className='fr-text--xs fr-text-mention--grey fr-mb-0'>
                Dernier événement : {latestEvent.message || statusLabel.label}
                {latestEventDate ? `, ${latestEventDate}` : ''}
              </span>
            )}

            {isPending && (
              <div className='flex flex-col gap-2'>
                <ProcessingLoader />
                <span className='fr-text--xs fr-text-mention--grey'>
                  Cette page se met à jour automatiquement.
                </span>
              </div>
            )}
          </div>
        }
      />
    </div>
  )
}

const MyDeclarationDetail = ({availablePoints = [], initialDeclaration, showDeclarant = false}) => {
  const [declaration, setDeclaration] = useState(initialDeclaration)
  const source = declaration?.source
  const displayStatus = getDeclarationDisplayStatus(declaration, source)
  const shouldRefresh = isDeclarationTreatmentPending(declaration, source)

  useEffect(() => {
    if (!shouldRefresh || !declaration?.id) {
      return undefined
    }

    let isDisposed = false
    let isRequestRunning = false

    const refresh = async () => {
      if (isRequestRunning) {
        return
      }

      isRequestRunning = true

      try {
        const result = await getDeclarationAction(declaration.id)

        if (!isDisposed && result?.success && result.data?.data) {
          setDeclaration(result.data.data)
        }
      } finally {
        isRequestRunning = false
      }
    }

    const interval = setInterval(refresh, REFRESH_INTERVAL)
    refresh()

    return () => {
      isDisposed = true
      clearInterval(interval)
    }
  }, [declaration?.id, shouldRefresh])

  const readingDateLabel = useMemo(() => getSourceReadingDateLabel(source), [source])
  const periodLabel = useMemo(
    () => readingDateLabel ?? getSourcePeriodLabel(source),
    [readingDateLabel, source]
  )

  return (
    <>
      <DeclarationOverview
        actions={(
          <DeclarationPointsChangeRequestAction
            declaration={declaration}
            periodLabel={periodLabel}
            status={displayStatus}
          />
        )}
        declaration={declaration}
        showDeclarant={showDeclarant}
        source={source}
        status={displayStatus}
        periodLabel={periodLabel}
      />

      {source?.status === 'COMPLETED' ? (
        <DeclarationDetails
          availablePoints={availablePoints}
          declaration={declaration}
          source={source}
          isInstructor={false}
          onDeclarationChange={setDeclaration}
        />
      ) : (
        <ProcessingState declaration={declaration} />
      )}
    </>
  )
}

export default MyDeclarationDetail
