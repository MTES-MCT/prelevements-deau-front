'use client'

import {
  useCallback, useEffect, useState, useRef, useMemo
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box} from '@mui/material'
import {orderBy} from 'lodash-es'

import PrelevementsAccordion from './dossier/prelevements/prelevements-accordion.js'

import DeclarationInfos from '@/components/declarations/declaration-infos.js'
import DeclarantDetails from '@/components/declarations/dossier/declarant-details.js'
import PointsPrelevementDetails from '@/components/declarations/dossier/points-prelevement-details.js'
import DeclarationFileDetails from '@/components/declarations/dossier/prelevements/declaration-file-details.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {computePointsStatus} from '@/lib/points-prelevement.js'
import {getPointPrelevementAction} from '@/server/actions/index.js'
import {formatNumber} from '@/utils/number.js'
import {getPointPrelevementName} from '@/utils/point-prelevement.js'

const DeclarationDetails = ({
  declaration,
  idPoints,
  source,
  isInstructor,
  availablePoints = []
}) => {
  const [pointsPrelevement, setPointsPrelevement] = useState(null)
  const [focusedPointId, setFocusedPointId] = useState(null)
  const [selectedAccordionId, setSelectedAccordionId] = useState(null)

  const handleSelectAccordion = useCallback(accordionId => {
    setSelectedAccordionId(prevId => prevId === accordionId ? null : accordionId)
  }, [])

  const listRefs = useRef({})

  useEffect(() => {
    const fetchPointsPrelevement = async () => {
      const results = await Promise.all(idPoints.map(idPoint => getPointPrelevementAction(idPoint)))
      const points = results.filter(r => r.success).map(r => r.data)
      const sortedPoints = orderBy(
        points,
        point => String(getPointPrelevementName(point)).toLowerCase(),
        'asc'
      )
      setPointsPrelevement(sortedPoints)
    }

    fetchPointsPrelevement()
  }, [idPoints])

  const onClickPointPrelevementMarker = useCallback(id => {
    setFocusedPointId(id)
    const ref = listRefs.current[id]
    if (ref) {
      ref.scrollIntoView({behavior: 'smooth', block: 'start'})
    }
  }, [])

  const pointsById = useMemo(() => {
    if (!pointsPrelevement) {
      return new Map()
    }

    return new Map(pointsPrelevement.map(point => [point.id, point]))
  }, [pointsPrelevement])

  const pointsStatus = useMemo(
    () => computePointsStatus({declaration, pointsPrelevement}),
    [declaration, pointsPrelevement]
  )

  const prelevementItems = useMemo(() => {
    const items = []

    for (const chunk of source.chunks) {
      const accordionId = `chunk-${chunk.id}`

      items.push({
        key: accordionId,
        sortName: chunk.pointPrelevementName,
        content: (
          <PrelevementsAccordion
            canShowVolumeData
            showPointPrelevementIdentificationHint
            isOpen={selectedAccordionId === accordionId}
            pointPrelevementId={chunk.pointPrelevement?.id}
            pointPrelevementName={chunk.pointPrelevement?.name}
            suggestedPointPrelevementName={chunk.pointPrelevementName}
            pointPrelevement={chunk.pointPrelevement}
            volumePreleveTotal={chunk.metadata?.totalWaterVolumeWithdrawn}
            volumeRejeteTotal={chunk.metadata?.totalWaterVolumeRejected}
            fallbackPointPrelevementName={chunk.pointPrelevementName}
            instructionStatus={chunk.instructionStatus}
            instructionComment={chunk.instructionComment}
            instructedAt={chunk.instructedAt}
            instructedBy={chunk.instructedByInstructor?.user}
            typePrelevement={declaration.type}
            handleSelectAccordion={() => handleSelectAccordion(accordionId)}
            chunkId={chunk.id}
            sourceId={source.id}
            canInstruct={isInstructor && chunk.canInstruct}
            availablePoints={availablePoints}
          >
            {selectedAccordionId === accordionId && (
              <DeclarationFileDetails
                pointId={chunk.pointPrelevementId}
                series={chunk.chunkValues}
                typePrelevement={declaration.type}
              />
            )}
          </PrelevementsAccordion>
        )
      })
    }

    return orderBy(
      items,
      [item => String(item.sortName ?? '').toLowerCase()],
      ['asc']
    )
  }, [
    declaration.type,
    source,
    selectedAccordionId
  ])

  const {totalWaterVolumeWithdrawn, totalWaterVolumeDischarged} = declaration?.source?.metadata ?? {}

  return (
    <Box className='flex flex-col gap-2 mb-4'>
      <DeclarationInfos
        numeroArreteAot={declaration.aotDecreeNumber}
        type={declaration.type}
        dataSourceType='SPREADSHEET'
        comment={declaration.comment}
        files={declaration.files}
      />

      <div className='flex flex-wrap gap-2'>
        {declaration.declarant && (
          <DeclarantDetails declarant={declaration.declarant} />
        )}
      </div>

      <PointsPrelevementDetails
        pointsPrelevementId={idPoints}
        pointsPrelevement={pointsPrelevement}
        handleClick={onClickPointPrelevementMarker}
        pointsStatus={pointsStatus}
      />

      {pointsPrelevement && (
        <SectionCard title='Prélèvements' icon='fr-icon-drop-line'>
          {totalWaterVolumeWithdrawn > 0 && (
            <Alert
              severity='info'
              className='mb-4'
              description={
                <>
                  Volume total prélevé : <b>{formatNumber(totalWaterVolumeWithdrawn)} m³</b>
                </>
              }
            />
          )}

          {totalWaterVolumeDischarged > 0 && (
            <Alert
              severity='info'
              className='mb-4'
              description={
                <>
                  Volume total rejeté : <b>{formatNumber(totalWaterVolumeDischarged)} m³</b>
                </>
              }
            />
          )}

          {prelevementItems.length > 0 && (
            <Box className='flex flex-col gap-4'>
              {prelevementItems.map(item => (
                <div key={item.key}>
                  {item.content}
                </div>
              ))}
            </Box>
          )}
        </SectionCard>
      )}
    </Box>
  )
}

export default DeclarationDetails
