import {Skeleton, Box} from '@mui/material'

import Compteur from './prelevements/compteur.js'

import PrelevementsAccordion from '@/components/declarations/dossier/prelevements/prelevements-accordion.js'
import Spreadsheet from '@/components/declarations/dossier/prelevements/spreadsheet.js'
import VolumesPompes from '@/components/declarations/dossier/prelevements/volumes-pompes.js'
import SectionCard from '@/components/ui/section-card.js'

const PrelevementsDetails = ({
  pointsPrelevement,
  selectedPointId,
  relevesIndex,
  volumesPompes,
  compteur,
  files,
  selectedPoint,
  handleDownload,
  listRefs
}) => (
  <SectionCard title='Prélèvements' icon='fr-icon-drop-line'>
    {files && pointsPrelevement ? (
      files.map(file => {
        const poinPrelevementId = file.result.data.pointPrelevement
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
              volumePreleveTotal={file.result.data.volumePreleveTotal}
              status={file?.result.errors?.length > 0 ? 'error' : 'success'}
              handleSelect={() => selectedPoint(poinPrelevementId)}
            >
              {volumesPompes && volumesPompes.length > 0 && (
                <VolumesPompes volumesPompes={volumesPompes} />
              )}
              {compteur && (
                <Compteur compteur={compteur} relevesIndex={relevesIndex} />
              )}
              <Spreadsheet
                file={file}
                downloadFile={handleDownload}
              />
            </PrelevementsAccordion>
          </Box>
        )
      })
    ) : (
      <Skeleton variant='rectangular' height={300} />
    )}
  </SectionCard>
)

export default PrelevementsDetails
