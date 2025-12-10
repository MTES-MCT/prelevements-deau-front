'use client'

import {
  useCallback, useEffect, useState, useRef,
  useMemo
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box} from '@mui/material'
import {flatMap, sumBy, orderBy} from 'lodash-es'

import PrelevementsAccordion from './dossier/prelevements/prelevements-accordion.js'
import VolumesPompes from './dossier/prelevements/volumes-pompes.js'

import DeclarantDetails from '@/components/declarations/dossier/declarant-details.js'
import DemandeurDetails from '@/components/declarations/dossier/demandeur-details.js'
import DossierInfos from '@/components/declarations/dossier/infos.js'
import PointsPrelevementDetails from '@/components/declarations/dossier/points-prelevement-details.js'
import Compteur from '@/components/declarations/dossier/prelevements/compteur.js'
import PreleveurDetails from '@/components/declarations/dossier/preleveur-details.js'
import FileValidationResult from '@/components/declarations/validateur/file-validation-result.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {getFileNameFromStorageKey} from '@/lib/dossier.js'
import {computePointsStatus} from '@/lib/points-prelevement.js'
import {getFileBlobAction, getPointPrelevementAction} from '@/server/actions/index.js'
import {formatNumber} from '@/utils/number.js'
import {getPointPrelevementName} from '@/utils/point-prelevement.js'

function getVolumePrelevementTotal(dossier, files) {
  const {relevesIndex, volumesPompes} = dossier

  // 1. Priorité aux fichiers si présents
  if (files?.length) {
    return sumBy(
      flatMap(files, file => file.result ? (file.result.totalVolumePreleve ? [file.result.totalVolumePreleve] : []) : []),
      v => v ?? 0
    )
  }

  // 2. Sinon, on regarde les relevés index
  if (relevesIndex?.length) {
    return sumBy(relevesIndex, r => r.valeur ?? 0)
  }

  // 3. Enfin, on se rabat sur les volumes pompés
  if (volumesPompes?.length) {
    return sumBy(volumesPompes, v => v.volumePompeM3 ?? 0)
  }

  // 4. Aucune donnée disponible
  return null
}

const DossierDetails = ({dossier, preleveur, files = [], idPoints}) => {
  const [pointsPrelevement, setPointsPrelevement] = useState(null)
  const [focusedPointId, setFocusedPointId] = useState(null)

  const listRefs = useRef({})

  // Récupération des points de prélèvement
  useEffect(() => {
    const fetchPointsPrelevement = async () => {
      const results = await Promise.all(idPoints.map(idPoint => getPointPrelevementAction(idPoint)))
      const points = results.map(r => r.data).filter(Boolean)
      const sortedPoints = orderBy(
        points, // Filtre 404 not found
        point => String(getPointPrelevementName(point)).toLowerCase(),
        'asc'
      )
      setPointsPrelevement(sortedPoints)
    }

    fetchPointsPrelevement()
  }, [idPoints])

  const downloadFile = useCallback(async attachmentId => {
    const {storageKey} = files.find(f => f._id === attachmentId) || {}
    const [, ...filenameParts] = storageKey.split('-')
    const filename = filenameParts.join('-')
    try {
      const result = await getFileBlobAction(dossier._id, attachmentId)
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
  }, [files, dossier._id])

  const onClickPointPrelevementMarker = useCallback(id => {
    setFocusedPointId(id)
    const ref = listRefs.current[id]
    if (ref) {
      ref.scrollIntoView({behavior: 'smooth', block: 'start'})
    }
  }, [])

  // Compute disabled points (no available prélèvement)
  const pointIdsWithNoPrelevement = useMemo(() => {
    if (pointsPrelevement) {
      const pointIdsWithData = new Set(pointsPrelevement.map(point => point.id_point))
      return idPoints.filter(id => !pointIdsWithData.has(id))
    }

    return idPoints
  }, [pointsPrelevement, idPoints])

  const pointsById = useMemo(() => {
    if (!pointsPrelevement) {
      return new Map()
    }

    return new Map(pointsPrelevement.map(point => [point.id_point, point]))
  }, [pointsPrelevement])

  const volumePrelevementTotal = useMemo(() => getVolumePrelevementTotal(dossier, files), [dossier, files])

  const pointsStatus = useMemo(() => computePointsStatus({dossier, files, pointsPrelevement}),
    [dossier, files, pointsPrelevement]
  )

  const prelevementItems = useMemo(() => {
    if (!pointsPrelevement) {
      return []
    }

    const shouldDisplayFiles = ['camion-citerne', 'aep-zre'].includes(dossier.typePrelevement)

    const collectPointNamesForFile = file => {
      const names = new Set()

      const addName = name => {
        if (name) {
          names.add(typeof name === 'string' ? name : String(name))
        }
      }

      if (Array.isArray(file.series)) {
        for (const serie of file.series) {
          const point = pointsById.get(serie.pointPrelevement)
          addName(getPointPrelevementName(point))
        }
      }

      if (Array.isArray(file.integrations)) {
        for (const integration of file.integrations) {
          const integrationName = getPointPrelevementName(integration.pointInfo)
          if (integrationName) {
            addName(integrationName)
          } else if (integration.pointInfo?.id_point) {
            const point = pointsById.get(integration.pointInfo.id_point)
            addName(getPointPrelevementName(point))
          }
        }
      }

      return orderBy(
        [...names],
        [name => String(name ?? '').toLowerCase()],
        ['asc']
      )
    }

    const items = []

    if (shouldDisplayFiles) {
      for (const file of files) {
        const sortedNames = collectPointNamesForFile(file)

        items.push({
          key: `file-${file._id}`,
          sortName: String(sortedNames[0] ?? ''),
          content: (
            <FileValidationResult
              scrollIntoView={focusedPointId}
              fileName={getFileNameFromStorageKey(file.storageKey)}
              attachmentId={file._id}
              typePrelevement={dossier.typePrelevement}
              pointsPrelevement={pointsPrelevement}
              series={file.series || []}
              integrations={file.integrations || []}
              validationStatus={file.validationStatus}
              errors={file.result?.errors || []}
              totalVolumePreleve={file.result?.totalVolumePreleve}
              downloadFile={downloadFile}
            />
          )
        })
      }
    }

    if ((dossier.volumesPompes || dossier.compteur) && pointsPrelevement.length > 0) {
      // Select manual point explicitly, e.g. by id or type
      const manualPoint = dossier.id_point_prelevement_manuel
        ? pointsPrelevement.find(p => p.id_point === dossier.id_point_prelevement_manuel)
        : pointsPrelevement.find(p => p.type === 'manuel' || p.isManual)
      if (manualPoint) {
        items.push({
          key: 'manual-prelevements',
          sortName: String(getPointPrelevementName(manualPoint)),
          content: (
            <PrelevementsAccordion
              isOpen
              idPoint={manualPoint?.id_point}
              pointPrelevement={manualPoint}
              volumePreleveTotal={volumePrelevementTotal}
              status={volumePrelevementTotal ? 'success' : 'error'}
            >
              {dossier.compteur && (
                <Compteur
                  compteur={dossier.compteur}
                  relevesIndex={dossier.relevesIndex}
                  moisDeclaration={dossier.moisDeclaration}
                />
              )}
              {dossier.volumesPompes && (
                <VolumesPompes volumesPompes={dossier.volumesPompes} />
              )}
            </PrelevementsAccordion>
          )
        })
      }
    }

    return orderBy(
      items,
      [item => String(item.sortName ?? '').toLowerCase()],
      ['asc']
    )
  }, [
    dossier.compteur,
    dossier.id_point_prelevement_manuel,
    dossier.moisDeclaration,
    dossier.relevesIndex,
    dossier.typePrelevement,
    dossier.volumesPompes,
    downloadFile,
    files,
    focusedPointId,
    pointsById,
    pointsPrelevement,
    volumePrelevementTotal
  ])
  return (
    <Box className='flex flex-col gap-2 mb-4'>
      <DossierInfos
        numeroArreteAot={dossier.numeroArreteAot}
        typePrelevement={dossier.typePrelevement}
        typeDonnees={dossier.typeDonnees}
        commentaires={dossier.commentaires}
      />

      <div className='flex flex-wrap gap-2'>
        {preleveur && (
          <PreleveurDetails preleveur={preleveur} />
        )}

        {!preleveur && dossier.demandeur && (
          <DemandeurDetails demandeur={dossier.demandeur} />
        )}

        {dossier.declarant && (
          <DeclarantDetails
            declarant={dossier.declarant}
            isMandataire={dossier.deposeParUnTiers}
          />
        )}
      </div>

      <PointsPrelevementDetails
        pointsPrelevementId={idPoints}
        pointsPrelevement={pointsPrelevement}
        handleClick={onClickPointPrelevementMarker}
        disabledPointIds={pointIdsWithNoPrelevement}
        pointsStatus={pointsStatus}
      />

      {pointsPrelevement && (
        <SectionCard title='Prélèvements' icon='fr-icon-drop-line'>
          {volumePrelevementTotal !== null && (
            <Alert
              severity='info'
              className='mb-4'
              description={
                <>
                  Volume total prélevé : <b>{formatNumber(volumePrelevementTotal)} m³</b>
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
