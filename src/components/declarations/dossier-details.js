'use client'

import {useCallback, useState} from 'react'

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
import DossierCommentaire from '@/components/declarations/dossier/commentaire.js'
import DeclarantDetails from '@/components/declarations/dossier/declarant-details.js'
import DemandeurDetails from '@/components/declarations/dossier/demandeur-details.js'
import FilesDetails from '@/components/declarations/dossier/files-details.js'
import DossierInfos from '@/components/declarations/dossier/infos.js'
import PointPrelevementDetails from '@/components/declarations/dossier/point-prelevement-details.js'
import PrelevementDetails from '@/components/declarations/dossier/prelevement-details.js'
import FileValidationErrors from '@/components/declarations/file-validation-errors.js'

const ModalSection = ({children}) => (
  <Box sx={{
    flex: 1,
    p: 1,
    backgroundColor: fr.colors.decisions.background.default.grey.hover
  }}
  >
    {children}
  </Box>
)

const DossierDetails = ({dossier, pointPrelevement}) => {
  const [openFiles, setOpenFiles] = useState({})

  const toggleFile = useCallback(file => {
    setOpenFiles(prev => ({...prev, [file]: !prev[file]}))
  }, [])

  const downloadFile = async ({checksum, filename}) => {
    try {
      const file = await getFile(dossier._id, checksum)
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

  return (
    <Box className='flex flex-col gap-2'>
      <DossierInfos {...dossier} />

      <div className='flex flex-wrap gap-2'>
        {dossier.demandeur && (
          <ModalSection>
            <DemandeurDetails {...dossier.demandeur} />
          </ModalSection>
        )}
        {dossier.declarant.type !== 'particulier' && (
          <ModalSection>
            <DeclarantDetails {...dossier.declarant} />
          </ModalSection>
        )}
      </div>

      {dossier.commentaires && (
        <ModalSection>
          <DossierCommentaire commentaire={dossier.commentaires} />
        </ModalSection>
      )}

      {pointPrelevement && (
        <ModalSection>
          <PointPrelevementDetails pointPrelevement={pointPrelevement} />
        </ModalSection>
      )}

      <ModalSection>
        <PrelevementDetails {...dossier} />
      </ModalSection>

      {dossier.typeDonnees === 'tableur' && (
        <ModalSection>
          <FilesDetails {...dossier} handleDownload={downloadFile} />
        </ModalSection>
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

