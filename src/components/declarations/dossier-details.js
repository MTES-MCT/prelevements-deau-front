'use client'

import {
  useCallback, useEffect, useState, useRef
} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Badge} from '@codegouvfr/react-dsfr/Badge'
import {Button} from '@codegouvfr/react-dsfr/Button'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import {
  List,
  ListItemText,
  Collapse,
  ListItemButton,
  ListItemIcon,
  Box,
  Typography
} from '@mui/material'

import {getFile} from '@/app/api/dossiers.js'
import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import FilesDetails from '@/components/declarations/dossier/files-details.js'
import DossierInfos from '@/components/declarations/dossier/infos.js'
import MandataireDetails from '@/components/declarations/dossier/mandataire-details.js'
import PointsPrelevementDetails from '@/components/declarations/dossier/points-prelevement-details.js'
import PrelevementsDetails from '@/components/declarations/dossier/prelevements-details.js'
import PreleveurDetails from '@/components/declarations/dossier/preleveur-details.js'
import FileValidationErrors from '@/components/declarations/file-validation-errors.js'

const ModalSection = ({children}) => (
  <Box sx={{
    flex: 1,
    p: 2,
    border: '1px solid',
    borderColor: fr.colors.decisions.border.default.grey.default
  }}
  >
    {children}
  </Box>
)

const DossierDetails = ({dossier, preleveur, files, idPoints}) => {
  const [openFiles, setOpenFiles] = useState({})
  const [pointsPrelevement, setPointsPrelevement] = useState(null)
  const [selectedPointId, setSelectedPointId] = useState(idPoints.length === 1 ? idPoints[0] : null)

  const listRefs = useRef({})

  useEffect(() => {
    const fetchPointsPrelevement = async () => {
      const points = await Promise.all(idPoints.map(idPoint => getPointPrelevement(idPoint)))
      setPointsPrelevement(points.filter(point => point._id)) // Filtre 404 not found
    }

    fetchPointsPrelevement()
  }, [idPoints])

  const toggleFile = useCallback(file => {
    setOpenFiles(prev => ({...prev, [file]: !prev[file]}))
  }, [])

  const downloadFile = async storageKey => {
    try {
      const file = await getFile(dossier._id, storageKey)
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = storageKey
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download file', error)
    }
  }

  const onClickPointPrelevementMarker = useCallback(id => {
    setSelectedPointId(id)
    const ref = listRefs.current[id]
    if (ref) {
      ref.scrollIntoView({behavior: 'smooth', block: 'start'})
    }
  }, [])

  return (
    <Box className='flex flex-col gap-2 mb-4'>
      <DossierInfos
        numeroArreteAot={dossier.numeroArreteAot}
        typePrelevement={dossier.typePrelevement}
        typeDonnees={dossier.typeDonnees}
        commentaires={dossier.commentaires}
      />

      <div className='flex flex-wrap gap-2'>
        {(dossier.demandeur || preleveur) && (
          <PreleveurDetails preleveur={preleveur || dossier.demandeur} />
        )}
        {dossier.declarant && dossier.declarant.type !== 'particulier' && (
          <MandataireDetails mandataire={dossier.declarant} />
        )}
      </div>

      <PointsPrelevementDetails
        pointsPrelevementId={idPoints}
        pointsPrelevement={pointsPrelevement}
        handleClick={onClickPointPrelevementMarker}
        selectedPointId={selectedPointId}
      />

      <PrelevementsDetails
        pointsPrelevement={pointsPrelevement}
        selectedPointId={selectedPointId}
        relevesIndex={dossier.relevesIndex}
        volumesPompes={dossier.volumesPompes}
        files={files}
        compteur={dossier.compteur}
        selectedPoint={idPoint => setSelectedPointId(prev => prev === idPoint ? null : idPoint)}
        listRefs={listRefs}
        handleDownload={downloadFile}
      />

      {dossier.typeDonnees === 'tableur' && (
        <FilesDetails
          extraitsRegistrePapier={dossier.extraitsRegistrePapier}
          registrePrelevementsTableur={dossier.registrePrelevementsTableur}
          tableauSuiviPrelevements={dossier.tableauSuiviPrelevements}
          donneesPrelevements={dossier.donneesPrelevements}
          handleDownload={downloadFile}
        />
      )}

      {dossier.errorsCount > 0 && dossier.files.length > 0 && (
        <ModalSection>
          <Box className='mt-8'>
            <Typography variant='h6'>
              <ErrorOutlineIcon color='error' className='mr-1' />
              Erreurs
            </Typography>
            <List>
              {dossier.files.map(
                ({filename, errors, checksum}) => {
                  const declarantErrors = errors.filter(({destinataire}) => destinataire === 'déclarant')
                  const administrateurErrors = errors.filter(({destinataire}) => destinataire === 'administrateur')

                  return (
                    <div key={filename}>
                      <div className='flex gap-2 items-center'>
                        <ListItemButton onClick={() => toggleFile(filename)}>
                          <ListItemText primary={filename} />
                          <ListItemIcon>
                            {declarantErrors.length > 0 && (
                              <div>
                                <Badge noIcon severity='warning'>
                                  {declarantErrors.length}
                                </Badge>
                              </div>
                            )}
                            {administrateurErrors.length > 0 && (
                              <div style={{marginLeft: '8px'}}>
                                <Badge noIcon severity='error'>
                                  {administrateurErrors.length}
                                </Badge>
                              </div>)}
                            {openFiles[filename] ? <ExpandLess /> : <ExpandMore />}
                          </ListItemIcon>
                        </ListItemButton>
                        <Button
                          iconId='fr-icon-download-line'
                          title='Télécharger'
                          onClick={() => downloadFile({checksum, filename})}
                        />
                      </div>
                      <Collapse unmountOnExit in={openFiles[filename]} timeout='auto'>
                        <FileValidationErrors errors={errors} />
                      </Collapse>
                    </div>
                  )
                }
              )}
            </List>
          </Box>
        </ModalSection>
      )}
    </Box>
  )
}

export default DossierDetails
