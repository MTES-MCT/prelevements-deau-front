import {useMemo} from 'react'

import {
  Skeleton, Box, Alert
} from '@mui/material'

import Compteur from './prelevements/compteur.js'

import PrelevementsAccordion from '@/components/declarations/dossier/prelevements/prelevements-accordion.js'
import Spreadsheet from '@/components/declarations/dossier/prelevements/spreadsheet.js'
import VolumesPompes from '@/components/declarations/dossier/prelevements/volumes-pompes.js'
import SectionCard from '@/components/ui/section-card.js'
import {formatNumber} from '@/utils/number.js'

// Helpers --------------------------------------------------------------

/**
 * Sort an array of points de prélèvement alphabetically by their `nom`.
 * @param {Array} points
 * @returns {Array}
 */
const sortPointsPrelevementByName = points =>
  [...points].sort((a, b) => {
    const nomA = a.nom?.toLowerCase() || ''
    const nomB = b.nom?.toLowerCase() || ''
    return nomA.localeCompare(nomB)
  })

/**
 * Sort files so that those without point de prélèvement come first,
 * then the others ordered by the name of their point de prélèvement.
 * @param {Array} files
 * @param {Array} pointsPrelevement
 * @returns {Array}
 */
const sortFilesByPointPrelevement = (files, pointsPrelevement) => {
  const findPoint = file =>
    pointsPrelevement.find(
      p =>
        p.id_point
        === (file.result?.data?.pointPrelevement || file.pointsPrelevements[0])
    )

  return [...files].sort((a, b) => {
    const pointA = findPoint(a)
    const pointB = findPoint(b)

    if (!pointA && pointB) {
      return -1
    }

    if (pointA && !pointB) {
      return 1
    }

    if (!pointA && !pointB) {
      return 0
    }

    const nomA = pointA.nom?.toLowerCase() || ''
    const nomB = pointB.nom?.toLowerCase() || ''
    return nomA.localeCompare(nomB)
  })
}

// ---------------------------------------------------------------------

const PrelevementsDetails = ({
  volumePrelevementTotal,
  moisDeclaration,
  tableauSuiviPrelevements,
  pointsPrelevement,
  selectedPointId,
  relevesIndex,
  volumesPompes,
  compteur,
  files,
  selectedPoint,
  handleDownload,
  listRefs
}) => {
  const content = useMemo(() => {
    if (!files || !pointsPrelevement) {
      return <Skeleton variant='rectangular' height={200} />
    }

    if (volumesPompes || compteur) {
      return (
        <PrelevementsAccordion
          isOpen
          idPoint={pointsPrelevement[0]}
          pointPrelevement={pointsPrelevement[0]}
          volumePreleveTotal={volumePrelevementTotal}
          status={volumePrelevementTotal ? 'success' : 'error'}
        >
          {compteur && (
            <Compteur
              compteur={compteur}
              relevesIndex={relevesIndex}
              moisDeclaration={moisDeclaration}
            />
          )}
          {volumesPompes && <VolumesPompes volumesPompes={volumesPompes} />}
        </PrelevementsAccordion>
      )
    }

    if (files && files.length > 0) {
      const sortedPointsPrelevement = sortPointsPrelevementByName(pointsPrelevement)
      const filesSorted = sortFilesByPointPrelevement(files, pointsPrelevement)

      return (
        filesSorted.map(file => {
          const poinPrelevementId = file.result?.data?.pointPrelevement || file.pointsPrelevements[0]
          return (
            <Box
              key={file._id}
              ref={el => {
                listRefs.current[poinPrelevementId] = el
              }}
              className='my-2'
            >
              <PrelevementsAccordion
                idPoint={poinPrelevementId}
                isOpen={selectedPointId === poinPrelevementId}
                pointPrelevement={sortedPointsPrelevement.find(p => p.id_point === poinPrelevementId)}
                volumePreleveTotal={file.result?.data?.volumePreleveTotal}
                status={file?.result.errors?.length > 0 || !file.result.data ? 'error' : 'success'}
                handleSelect={() => selectedPoint(poinPrelevementId)}
              >
                {tableauSuiviPrelevements && (
                  <Alert severity='info'>
                    Ce type de dossier n’est pas encore pris en charge.
                  </Alert>
                )}

                <Spreadsheet
                  moisDeclaration={moisDeclaration}
                  file={file}
                  downloadFile={handleDownload}
                />
              </PrelevementsAccordion>
            </Box>
          )
        })
      )
    }

    return (
      <Alert severity='warning'>
        Aucun prélèvement n&apos;a été renseigné.
      </Alert>
    )
  }, [
    volumePrelevementTotal,
    moisDeclaration,
    tableauSuiviPrelevements,
    pointsPrelevement,
    selectedPointId,
    relevesIndex,
    volumesPompes,
    compteur,
    files,
    selectedPoint,
    handleDownload,
    listRefs
  ])

  return (
    <SectionCard title='Prélèvements' icon='fr-icon-drop-line'>
      {volumePrelevementTotal !== null && (
        <Alert severity='info'>
          Volume total prélevé : <b>{formatNumber(volumePrelevementTotal)} m³</b>
        </Alert>
      )}

      {content}
    </SectionCard>
  )
}

export default PrelevementsDetails
