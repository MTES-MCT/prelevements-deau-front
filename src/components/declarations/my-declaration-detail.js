'use client'

import {useEffect, useMemo, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {CircularProgress} from '@mui/material'

import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationOverview from '@/components/declarations/declaration-overview.js'
import DeclarationPointsChangeRequestAction from '@/components/declarations/declaration-points-change-request-action.js'
import DeclarationSubmissionFlash from '@/components/declarations/declaration-submission-flash.js'
import {
  getDeclarationDisplayStatus,
  getSourceReadingDateLabel,
  getSourcePeriodLabel,
  isDeclarationTreatmentPending,
  isPointReconciliationRelevant,
  sourceStateLabels
} from '@/lib/declaration.js'
import {
  getAvailablePointsPrelevementsForDeclarationAction,
  getDeclarationAction
} from '@/server/actions/declarations.js'

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

const AvailablePointsLoadingState = () => (
  <div className='fr-mb-6w'>
    <Alert
      severity='info'
      title='Chargement des points'
      description={(
        <div className='flex items-center gap-2'>
          <CircularProgress aria-label='Chargement des points' size={20} />
          <span>Chargement des points disponibles.</span>
        </div>
      )}
    />
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
  const [availableDeclarationPoints, setAvailableDeclarationPoints] = useState(availablePoints)
  const [loadedAvailablePointsKey, setLoadedAvailablePointsKey] = useState(
    availablePoints.length > 0 && initialDeclaration?.source?.id
      ? `${initialDeclaration.id}:${initialDeclaration.source.id}`
      : null
  )
  const source = declaration?.source
  const displayStatus = getDeclarationDisplayStatus(declaration, source)
  const shouldRefresh = isDeclarationTreatmentPending(declaration, source)
  const shouldLoadAvailablePoints = source?.status === 'COMPLETED'
    && isPointReconciliationRelevant(declaration, source)
  const availablePointsKey = shouldLoadAvailablePoints && declaration?.id && source?.id
    ? `${declaration.id}:${source.id}`
    : null
  const isAvailablePointsPending = shouldLoadAvailablePoints
    && loadedAvailablePointsKey !== availablePointsKey

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

  useEffect(() => {
    if (!availablePointsKey || loadedAvailablePointsKey === availablePointsKey) {
      return undefined
    }

    let isDisposed = false

    const loadAvailablePoints = async () => {
      try {
        const result = await getAvailablePointsPrelevementsForDeclarationAction(declaration.id)

        if (!isDisposed && result?.success) {
          setAvailableDeclarationPoints(result.data?.data ?? [])
          setLoadedAvailablePointsKey(availablePointsKey)
        }
      } catch (error) {
        console.error(error)
        if (!isDisposed) {
          setLoadedAvailablePointsKey(availablePointsKey)
        }
      }
    }

    loadAvailablePoints()

    return () => {
      isDisposed = true
    }
  }, [availablePointsKey, declaration?.id, loadedAvailablePointsKey])

  const readingDateLabel = useMemo(() => getSourceReadingDateLabel(source), [source])
  const periodLabel = useMemo(
    () => readingDateLabel ?? getSourcePeriodLabel(source),
    [readingDateLabel, source]
  )

  let declarationDetailsContent

  if (source?.status === 'COMPLETED' && !isAvailablePointsPending) {
    declarationDetailsContent = (
      <DeclarationDetails
        availablePoints={availableDeclarationPoints}
        declaration={declaration}
        source={source}
        isInstructor={false}
        onDeclarationChange={setDeclaration}
      />
    )
  } else if (source?.status === 'COMPLETED' && isAvailablePointsPending) {
    declarationDetailsContent = <AvailablePointsLoadingState />
  } else {
    declarationDetailsContent = <ProcessingState declaration={declaration} />
  }

  return (
    <>
      <DeclarationSubmissionFlash />

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

      {declarationDetailsContent}
    </>
  )
}

export default MyDeclarationDetail
