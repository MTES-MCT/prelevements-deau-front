'use client'

import {useEffect, useMemo, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {CircularProgress} from '@mui/material'

import DeclarationDetails from '@/components/declarations/declaration-details.js'
import DeclarationHeader from '@/components/declarations/declaration-header.js'
import DeclarationInfos from '@/components/declarations/declaration-infos.js'
import {
  getPointsPrelevementIdsFromDeclaration,
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
    <div className='fr-container fr-mt-4w fr-mb-6w'>
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

      <DeclarationInfos
        aotDecreeNumber={declaration.aotDecreeNumber}
        type={declaration.type}
        declarationType={declaration.declarationType}
        dataSourceType={declaration.dataSourceType ?? 'SPREADSHEET'}
        comment={declaration.comment}
        files={declaration.files}
        declarant={declaration.declarant}
        createdByDeclarant={declaration.createdByDeclarant}
      />
    </div>
  )
}

const MyDeclarationDetail = ({initialDeclaration}) => {
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
  const idPoints = useMemo(() => getPointsPrelevementIdsFromDeclaration(declaration), [declaration])

  return (
    <>
      <DeclarationHeader
        numero={declaration.code}
        status={displayStatus}
        dateDepot={declaration.createdAt}
        periodLabel={periodLabel}
      />

      {source?.status === 'COMPLETED' ? (
        <div className='fr-container'>
          <DeclarationDetails
            declaration={declaration}
            idPoints={idPoints}
            source={source}
            isInstructor={false}
          />
        </div>
      ) : (
        <ProcessingState declaration={declaration} />
      )}
    </>
  )
}

export default MyDeclarationDetail
