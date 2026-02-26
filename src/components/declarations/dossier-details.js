'use client'

import {
  useCallback, useEffect, useState, useRef,
  useMemo
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box} from '@mui/material'
import {orderBy} from 'lodash-es'

import PrelevementsAccordion from './dossier/prelevements/prelevements-accordion.js'

import DeclarantDetails from '@/components/declarations/dossier/declarant-details.js'
import DossierInfos from '@/components/declarations/dossier/infos.js'
import PointsPrelevementDetails from '@/components/declarations/dossier/points-prelevement-details.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {computePointsStatus} from '@/lib/points-prelevement.js'
import {getFileBlobAction, getPointPrelevementAction} from '@/server/actions/index.js'
import {formatNumber} from '@/utils/number.js'
import {getPointPrelevementName} from '@/utils/point-prelevement.js'

const DossierDetails = ({declaration, files = [], idPoints}) => {
  const [pointsPrelevement, setPointsPrelevement] = useState(null)
  const [focusedPointId, setFocusedPointId] = useState(null)

  const listRefs = useRef({})

  // Récupération des points de prélèvement
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

  const downloadFile = useCallback(async attachmentId => {
    const {storageKey} = files.find(f => f.id === attachmentId) || {}
    const [, ...filenameParts] = storageKey.split('-')
    const filename = filenameParts.join('-')
    try {
      const result = await getFileBlobAction(declaration.id, attachmentId)
      const file = result.data
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download file', error)
    }
  }, [files, declaration.id])

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

  const pointsStatus = useMemo(() => computePointsStatus({declaration, files, pointsPrelevement}),
    [declaration, files, pointsPrelevement]
  )

  const prelevementItems = useMemo(() => {
    const chunks = declaration.source?.chunks || []
    const items = []

    for (const chunk of chunks) {
      items.push({
        key: `chunk-${chunk.id}`,
        sortName: chunk.pointPrelevementName,
        content: (
          <PrelevementsAccordion
            isOpen
            idPoint={chunk.pointPrelevement?.id}
            pointPrelevement={chunk.pointPrelevement}
            volumePreleveTotal={chunk.metadata?.totalWaterVolumeWithdrawn}
            volumeRejeteTotal={chunk.metadata?.totalWaterVolumeRejected}
            fallbackPointPrelevementName={chunk.pointPrelevementName}
            status={chunk.metadata?.totalWaterVolumeWithdrawn > 0 ? 'success' : 'error'}
            typePrelevement={declaration.type}
          />
        )
      })
    }

    return orderBy(
      items,
      [item => String(item.sortName ?? '').toLowerCase()],
      ['asc']
    )
  }, [
    declaration,
    downloadFile,
    files,
    focusedPointId,
    pointsById,
    pointsPrelevement
  ])

  const {totalWaterVolumeWithdrawn, totalWaterVolumeDischarged} = declaration?.source?.metadata ?? {}

  return (
    <Box className='flex flex-col gap-2 mb-4'>
      <DossierInfos
        numeroArreteAot={declaration.aotDecreeNumber}
        type={declaration.type}
        dataSourceType='SPREADSHEET'
        comment={declaration.comment}
        files={declaration.files}
      />

      <div className='flex flex-wrap gap-2'>
        {declaration.declarant && (
          <DeclarantDetails
            declarant={declaration.declarant}
          />
        )}
      </div>

      <PointsPrelevementDetails
        pointsPrelevementId={idPoints}
        pointsPrelevement={pointsPrelevement}
        handleClick={onClickPointPrelevementMarker}
        pointsStatus={pointsStatus}
      />

      { pointsPrelevement && (
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
            <div className='flex flex-col gap-4'>
              {prelevementItems.map(item => (
                <div key={item.key}>
                  {item.content}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </Box>
  )
}

export default DossierDetails
