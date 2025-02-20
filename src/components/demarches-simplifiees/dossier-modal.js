'use client'

import {useCallback, useEffect, useState} from 'react'

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
  CircularProgress,
  Typography
} from '@mui/material'

import {getDossier, getFile} from '@/app/api/dossiers.js'
import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import DossierCommentaire from '@/components/demarches-simplifiees/dossier/commentaire.js'
import DeclarantDetails from '@/components/demarches-simplifiees/dossier/declarant-details.js'
import DemandeurDetails from '@/components/demarches-simplifiees/dossier/demandeur-details.js'
import FilesDetails from '@/components/demarches-simplifiees/dossier/files-details.js'
import DossierInfos from '@/components/demarches-simplifiees/dossier/infos.js'
import PointPrelevementDetails from '@/components/demarches-simplifiees/dossier/point-prelevement-details.js'
import PrelevementDetails from '@/components/demarches-simplifiees/dossier/prelevement-details.js'
import FileValidationErrors from '@/components/demarches-simplifiees/file-validation-errors.js'

const ModalSection = ({children}) => (
  <Box sx={{
    p: 1,
    backgroundColor: fr.colors.decisions.background.default.grey.hover
  }}
  >
    {children}
  </Box>
)

const DossierModal = ({selectedDossier}) => {
  const [openFiles, setOpenFiles] = useState({})
  const [pointPrelevement, setPointPrelevement] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [files, setFiles] = useState([])

  useEffect(() => {
    async function fetchDossier() {
      const dossier = await getDossier(selectedDossier._id)
      setFiles(dossier.files?.filter(({errors}) => errors.length > 0) || [])
      setIsLoading(false)
    }

    async function fetchPointPrelevement() {
      const pointPrelevement = await getPointPrelevement(selectedDossier.pointPrelevement)
      setPointPrelevement(pointPrelevement)
    }

    fetchDossier()

    if (selectedDossier.pointPrelevement) {
      fetchPointPrelevement()
    } else {
      setPointPrelevement(null)
    }
  }, [selectedDossier._id, selectedDossier.pointPrelevement])

  const toggleFile = useCallback(file => {
    setOpenFiles(prev => ({...prev, [file]: !prev[file]}))
  }, [])

  const downloadFile = useCallback(async ({checksum, filename}) => {
    try {
      const file = await getFile(selectedDossier._id, checksum)
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download file', error)
    }
  }, [selectedDossier._id])

  return (
    <Box className='flex flex-col gap-2'>
      <DossierInfos {...selectedDossier} />

      {selectedDossier.demandeur && (
        <ModalSection>
          <DemandeurDetails {...selectedDossier.demandeur} />
        </ModalSection>
      )}
      {selectedDossier.declarant.type !== 'particulier' && (
        <ModalSection>
          <DeclarantDetails {...selectedDossier.declarant} />
        </ModalSection>
      )}
      {selectedDossier.commentaires && (
        <ModalSection>
          <DossierCommentaire commentaire={selectedDossier.commentaires} />
        </ModalSection>
      )}

      {pointPrelevement && (
        <ModalSection>
          <PointPrelevementDetails {...pointPrelevement} />
        </ModalSection>
      )}

      <ModalSection>
        <PrelevementDetails {...selectedDossier} />
      </ModalSection>

      {selectedDossier.typeDonnees === 'tableur' && (
        <ModalSection>
          <FilesDetails {...selectedDossier} handleDownload={downloadFile} />
        </ModalSection>
      )}

      {isLoading && (
        <Box>
          <CircularProgress />
        </Box>
      )}

      {selectedDossier.errorsCount > 0 && files.length > 0 && (
        <ModalSection>
          <Box className='mt-8'>
            <Typography variant='h6'>
              <ErrorOutlineIcon color='error' className='mr-1' />
              Erreurs
            </Typography>
            <List>
              {files.map(
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

export default DossierModal

