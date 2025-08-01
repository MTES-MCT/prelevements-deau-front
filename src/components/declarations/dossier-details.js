'use client'

import {
  useCallback, useEffect, useState, useRef,
  useMemo
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box, Skeleton} from '@mui/material'
import {flatMap, sumBy} from 'lodash'

import SectionCard from '../ui/section-card.js'

import PrelevementsAccordion from './dossier/prelevements/prelevements-accordion.js'
import VolumesPompes from './dossier/prelevements/volumes-pompes.js'

import {getFileBlob} from '@/app/api/dossiers.js'
import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import DemandeurDetails from '@/components/declarations/dossier/demandeur-details.js'
import DossierInfos from '@/components/declarations/dossier/infos.js'
import MandataireDetails from '@/components/declarations/dossier/mandataire-details.js'
import PointsPrelevementDetails from '@/components/declarations/dossier/points-prelevement-details.js'
import Compteur from '@/components/declarations/dossier/prelevements/compteur.js'
import PreleveurDetails from '@/components/declarations/dossier/preleveur-details.js'
import FileValidationResult from '@/components/declarations/validateur/file-validation-result.js'
import {getFileNameFromStorageKey} from '@/lib/dossier.js'
import {computePointsStatus} from '@/lib/points-prelevement.js'
import {formatNumber} from '@/utils/number.js'

function getVolumePrelevementTotal(dossier, files) {
  const {relevesIndex, volumesPompes, typePrelevement} = dossier

  // 1. Priorité aux fichiers si présents
  if (files?.length) {
    if (typePrelevement === 'camion-citerne') {
      return sumBy(flatMap(files, file => file.result.data),
        'volumePreleveTotal'
      )
    }

    return sumBy(files, f => f.result?.data?.volumePreleveTotal ?? 0)
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

const DossierDetails = ({dossier, preleveur, files, idPoints}) => {
  const [pointsPrelevement, setPointsPrelevement] = useState(null)
  const [focusedPointId, setFocusedPointId] = useState(null)

  const listRefs = useRef({})

  // Récupération des points de prélèvement
  useEffect(() => {
    const fetchPointsPrelevement = async () => {
      const points = await Promise.all(idPoints.map(idPoint => getPointPrelevement(idPoint)))
      setPointsPrelevement(points.filter(Boolean)) // Filtre 404 not found
    }

    fetchPointsPrelevement()
  }, [idPoints])

  const downloadFile = async storageKey => {
    const [hash, ...filenameParts] = storageKey.split('-')
    const filename = filenameParts.join('-')
    try {
      const file = await getFileBlob(dossier._id, hash)
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download file', error)
    }
  }

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

  const volumePrelevementTotal = useMemo(() => getVolumePrelevementTotal(dossier, files), [dossier, files])

  const pointsStatus = useMemo(() => computePointsStatus({dossier, files, pointsPrelevement}),
    [dossier, files, pointsPrelevement]
  )
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
        {dossier.declarant && dossier.declarant.type !== 'particulier' && (
          <MandataireDetails mandataire={dossier.declarant} />
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

          {(!files || !pointsPrelevement) && (
            <Skeleton variant='rectangular' height={200} />
          )}

          {['camion-citerne', 'aep-zre'].includes(dossier.typePrelevement) && (
            <div className='flex flex-col gap-4'>
              {files.map(file => (
                <FileValidationResult
                  key={file.storageKey}
                  scrollIntoView={focusedPointId}
                  fileName={getFileNameFromStorageKey(file.storageKey)}
                  storageKey={file.storageKey}
                  typePrelevement={dossier.typePrelevement}
                  pointsPrelevement={pointsPrelevement}
                  data={file.processingError ? null : (dossier.typePrelevement === 'aep-zre' ? [file.result.data] : file.result.data)}
                  errors={file.processingError ? [{severity: 'error', message: file.processingError}] : file.result.errors}
                  processingError={file.processingError}
                  downloadFile={downloadFile}
                />
              ))}
            </div>
          )}

          {(dossier.volumesPompes || dossier.compteur) && (
            (
              <PrelevementsAccordion
                isOpen
                idPoint={pointsPrelevement[0]?.id_point}
                pointPrelevement={pointsPrelevement[0]}
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
          )}
        </SectionCard>
      )}
    </Box>
  )
}

export default DossierDetails
