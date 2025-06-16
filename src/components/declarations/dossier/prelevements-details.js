import {useMemo} from 'react'

import {Skeleton, Box, Alert} from '@mui/material'

import Compteur from './prelevements/compteur.js'

import PrelevementsAccordion from '@/components/declarations/dossier/prelevements/prelevements-accordion.js'
import Spreadsheet from '@/components/declarations/dossier/prelevements/spreadsheet.js'
import VolumesPompes from '@/components/declarations/dossier/prelevements/volumes-pompes.js'
import SectionCard from '@/components/ui/section-card.js'

const PrelevementsDetails = ({
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
      let volumePreleveTotal = null
      if (relevesIndex) {
        volumePreleveTotal = relevesIndex.reduce((acc, volume) => acc + volume.valeur, 0)
      } else if (volumesPompes) {
        volumePreleveTotal = volumePreleveTotal.reduce((acc, volume) => acc + volume.volumePompeM3, 0)
      }

      return (
        <PrelevementsAccordion
          isOpen
          idPoint={pointsPrelevement[0]}
          pointPrelevement={pointsPrelevement[0]}
          volumePreleveTotal={volumePreleveTotal}
          status={volumePreleveTotal ? 'success' : 'error'}
        >

          {compteur && <Compteur compteur={compteur} relevesIndex={relevesIndex} />}
          {volumesPompes && <VolumesPompes volumesPompes={volumesPompes} />}
        </PrelevementsAccordion>
      )
    }

    if (tableauSuiviPrelevements) {
      return (
        <Alert severity='info'>
          Ce type de dossier n’est pas encore pris en charge.
        </Alert>
      )
    }

    if (files && files.length > 0) {
      return (
        files.map(file => {
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
                pointPrelevement={pointsPrelevement.find(p => p.id_point === poinPrelevementId)}
                volumePreleveTotal={file.result?.data?.volumePreleveTotal}
                status={file?.result.errors?.length > 0 || !file.result.data ? 'error' : 'success'}
                handleSelect={() => selectedPoint(poinPrelevementId)}
              >
                <Spreadsheet
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
      {content}
    </SectionCard>
  )
}

export default PrelevementsDetails
