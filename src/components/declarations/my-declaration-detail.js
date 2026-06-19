'use client'

import {useEffect, useMemo, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {CircularProgress} from '@mui/material'

import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationOverview from '@/components/declarations/declaration-overview.js'
import DeclarationPointsChangeRequestAction from '@/components/declarations/declaration-points-change-request-action.js'
import {
  getSourcePeriodLabel,
  sourceStateLabels
} from '@/lib/declaration.js'
import {getDeclarationAction} from '@/server/actions/declarations.js'

const REFRESH_INTERVAL = 3000

function getDisplayStatus(source) {
  if (!source) {
    return 'PROCESSING'
  }

  if (source.status === 'COMPLETED') {
    return source.globalInstructionStatus
  }

  return source.status ?? 'PROCESSING'
}

function isTreatmentPending(source) {
  return !source || source.status === 'PENDING' || source.status === 'PROCESSING'
}

const ProcessingLoader = () => (
  <div className='flex items-center gap-2'>
    <CircularProgress aria-label='Traitement en cours' size={20} />
    <span>Traitement de la déclaration en cours.</span>
  </div>
)

const ProcessingState = ({declaration}) => {
  const source = declaration?.source
  const displayStatus = getDisplayStatus(source)
  const statusLabel = sourceStateLabels[displayStatus] ?? sourceStateLabels.PROCESSING
  const isPending = isTreatmentPending(source)

  return (
    <div className='fr-mb-6w'>
      <Alert
        severity={statusLabel.severity}
        title={statusLabel.label}
        description={
          <div className='flex flex-col gap-2'>
            <span>
              {source?.status === 'FAILED'
                ? 'Le traitement automatique n’a pas abouti. Les fichiers déposés restent disponibles ci-dessous.'
                : 'Les fichiers ont bien été déposés. Le traitement peut prendre quelques minutes pour les fichiers volumineux.'}
            </span>

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

const MyDeclarationDetail = ({availablePoints = [], initialDeclaration}) => {
  const [declaration, setDeclaration] = useState(initialDeclaration)
  const source = declaration?.source
  const displayStatus = getDisplayStatus(source)
  const shouldRefresh = isTreatmentPending(source)

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

  const periodLabel = useMemo(() => getSourcePeriodLabel(source), [source])

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
