'use client'

import {
  useCallback, useEffect, useState
} from 'react'

import {Badge} from '@codegouvfr/react-dsfr/Badge'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Highlight} from '@codegouvfr/react-dsfr/Highlight'
import {
  Person, WaterDrop, Colorize, FolderOpen,
  Speed
} from '@mui/icons-material'
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
  Typography, Grid2 as Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material'
import {format} from 'date-fns'

import {getDossier, getFile} from '@/app/api/dossiers.js'
import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import DossierStateBadge from '@/components/demarches-simplifiees/dossier-state-badge.js'
import FileValidationErrors from '@/components/demarches-simplifiees/file-validation-errors.js'
import PrelevementTypeBadge from '@/components/demarches-simplifiees/prelevement-type-badge.js'
import TypeSaisieBadge from '@/components/demarches-simplifiees/type-saisie-badge.js'

const DemandeurDetails = ({nom, prenom}) => (
  <Box className='mt-2'>
    <Typography gutterBottom variant='h6' className='flex items-center gap-1'>
      <Person />
      Demandeur
    </Typography>
    <Grid container spacing={2}>
      <Grid xs={6}>
        <Typography variant='body1' color='text.secondary'>
          <strong>Nom:</strong>
        </Typography>
      </Grid>
      <Grid xs={6}>
        <Typography variant='body1'>{nom}</Typography>
      </Grid>

      <Grid xs={6}>
        <Typography variant='body1' color='text.secondary'>
          <strong>Prénom:</strong>
        </Typography>
      </Grid>
      <Grid xs={6}>
        <Typography variant='body1'>{prenom}</Typography>
      </Grid>
    </Grid>
  </Box>
)

const DeclarantDetails = ({raisonSociale, email, telephone}) => (
  <Box className='mt-2'>
    <Typography gutterBottom variant='h6' className='flex items-center gap-1'>
      <Person />
      Déclarant
    </Typography>
    <Box className='flex flex-col gap-2'>
      <Typography variant='body1' color='text.secondary'>
        <strong>{raisonSociale}</strong>
      </Typography>

      <Box className='flex flex-wrap gap-2'>
        <Typography variant='body1' color='text.secondary'>
          <strong>Email:</strong>
        </Typography>
        <Typography variant='body1'>{email}</Typography>
      </Box>

      <Box className='flex flex-wrap gap-2'>
        <Typography variant='body1' color='text.secondary'>
          <strong>Téléphone:</strong>
        </Typography>
        <Typography variant='body1'>{telephone}</Typography>
      </Box>
    </Box>
  </Box>
)

const DossierInfo = ({dateDepot, status}) => (
  <Box className='flex justify-between mt-2'>
    <Box className='flex flex-wrap gap-2'>
      <Typography variant='body1' color='text.secondary'>
        <strong>Date de dépôt:</strong>
      </Typography>
      <Typography variant='body1'>
        {new Intl.DateTimeFormat('fr-FR', {dateStyle: 'short'}).format(new Date(dateDepot))}
      </Typography>
    </Box>

    <Box className='flex gap-2 mb-2'>
      <DossierStateBadge value={status} />
    </Box>
  </Box>
)

const DossierCommentaire = ({commentaire}) => (
  <Box className='flex flex-col gap-2'>
    <Typography variant='body1' color='text.secondary'>
      <strong>Commentaire</strong>
    </Typography>
    <Highlight size='sm'>
      {commentaire}
    </Highlight>
  </Box>
)

const PointPrelevementDetails = ({nom, id_point: id, typeMilieu, usages}) => (
  <Box className='mt-2'>
    <Typography gutterBottom variant='h6' className='flex items-center gap-1'>
      <WaterDrop />
      Point de prélèvement
    </Typography>
    <Box className='flex flex-col gap-2'>
      <Typography variant='body1' color='text.secondary'>
        <strong>{nom}</strong> ({id})
      </Typography>

      <Box className='flex flex-wrap gap-2'>
        <Typography variant='body1' color='text.secondary'>
          <strong>Type de milieu:</strong>
        </Typography>
        <Chip label={typeMilieu} size='small' />
      </Box>

      <Box className='flex flex-wrap gap-2'>
        <Typography variant='body1' color='text.secondary'>
          <strong>Usages:</strong>
        </Typography>
        {usages.some(Boolean).length > 0 ? (
          <Box className='flex gap-1'>
            {usages.map(usage => (
              <Chip
                key={usage}
                label={usage}
                size='small'
                variant='outlined' />
            ))}
          </Box>
        ) : (
          <Typography variant='body2'>
            <i>Aucun usage renseigné</i>
          </Typography>
        )}
      </Box>
    </Box>
  </Box>
)

const PrelevementDetails = ({
  typePrelevement,
  typeDonnees,
  relevesIndex,
  volumesPompes,
  compteur
}) => (
  <Box className='mt-2'>
    <Typography gutterBottom variant='h6' className='flex items-center gap-1'>
      <Colorize />
      Prélèvement
    </Typography>
    <Box className='flex flex-col gap-2'>
      <Box className='flex gap-2'>
        <Typography variant='body1' color='text.secondary'>
          <strong>Type de prélèvement:</strong>
        </Typography>
        <PrelevementTypeBadge value={typePrelevement} />
      </Box>
      <Box className='flex gap-2'>
        <Typography variant='body1' color='text.secondary'>
          <strong>Type de saisie:</strong>
        </Typography>
        <TypeSaisieBadge value={typeDonnees} />
      </Box>
    </Box>

    {/* Section Données quantitatives */}
    {volumesPompes && volumesPompes.length > 0 && (
      <Box className='mt-4'>
        <Typography gutterBottom variant='h6'>
          Volumes prélevés
        </Typography>
        <Box className='mt-2'>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Point de prélèvement</TableCell>
                  <TableCell>Date / Année</TableCell>
                  <TableCell align='right'>Volume (m³)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {volumesPompes.map(row => (
                  <TableRow key={`${row.pointPrelevement}-${row.datePrelevement || row.anneePrelevement}-${row.volumePompeM3}`}>
                    <TableCell>{row.pointPrelevement}</TableCell>
                    <TableCell>{row.datePrelevement || row.anneePrelevement}</TableCell>
                    <TableCell align='right'>{row.volumePompeM3}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    )}

    {relevesIndex && relevesIndex.length > 0 && (
      <Box className='mt-4'>
        <Typography gutterBottom variant='h6'>
          Historique des relevés
        </Typography>
        <Box className='mt-2'>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align='right'>Valeur</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {relevesIndex.map(row => (
                  <TableRow key={`releve-${row.date}-${row.valeur}`}>
                    <TableCell>{format(new Date(row.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell align='right'>{row.valeur}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    )}

    {/* Section Compteur */}
    {compteur && (
      <Box className='mt-4'>
        <Box className='flex align-center gap-1'>
          <Speed />
          <Typography gutterBottom variant='h6'>
            Compteur
          </Typography>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell><strong>Compteur volumétrique:</strong></TableCell>
                <TableCell>{compteur.compteurVolumetrique ? 'Oui' : 'Non'}</TableCell>
              </TableRow>
              {compteur.numeroSerie && (
                <TableRow>
                  <TableCell><strong>Numéro de série:</strong></TableCell>
                  <TableCell>{compteur.numeroSerie}</TableCell>
                </TableRow>
              )}
              {compteur.lectureDirecte !== undefined && (
                <TableRow>
                  <TableCell><strong>Lecture directe:</strong></TableCell>
                  <TableCell>{compteur.lectureDirecte ? 'Oui' : 'Non'}</TableCell>
                </TableRow>
              )}
              {compteur.signalementPanneOuChangement !== undefined && (
                <TableRow>
                  <TableCell><strong>Signalement panne/changement:</strong></TableCell>
                  <TableCell>{compteur.signalementPanneOuChangement ? 'Oui' : 'Non'}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    )}
  </Box>
)

const FilesDetails = ({
  extraitsRegistrePapier,
  registrePrelevementsTableur,
  tableauSuiviPrelevements,
  donneesPrelevements,
  handleDownload
}) => {
  // Fusionner les documents extraits et le tableur dans une seule liste
  const documents = []
  if (extraitsRegistrePapier && extraitsRegistrePapier.length > 0) {
    for (const doc of extraitsRegistrePapier) {
      documents.push({
        filename: doc.fichier.filename,
        checksum: doc.fichier.checksum,
        documentType: 'extrait registre papier'
      })
    }
  }

  if (registrePrelevementsTableur) {
    documents.push({
      filename: registrePrelevementsTableur.filename,
      checksum: registrePrelevementsTableur.checksum,
      documentType: 'tableur'
    })
  }

  if (tableauSuiviPrelevements) {
    documents.push({
      filename: tableauSuiviPrelevements.filename,
      checksum: tableauSuiviPrelevements.checksum,
      documentType: 'tableau de suivi'
    })
  }

  if (donneesPrelevements) {
    for (const prelevement of donneesPrelevements) {
      if (prelevement.fichier) {
        documents.push({
          filename: prelevement.fichier.filename,
          checksum: prelevement.fichier.checksum,
          documentType: 'données de prélèvements'
        })
      }
    }
  }

  return (
    <Box className='mt-4'>
      <Box className='flex align-center gap-1'>
        <FolderOpen />
        <Typography gutterBottom variant='h6'>
          Pièces justificatives
        </Typography>
      </Box>

      <Box className='mt-2'>
        {documents.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom du fichier</TableCell>
                  <TableCell>Type de document</TableCell>
                  <TableCell align='right' />
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map(({checksum, filename, documentType}) => (
                  <TableRow key={checksum}>
                    <TableCell>{filename}</TableCell>
                    <TableCell>{documentType}</TableCell>
                    <TableCell align='right'>
                      <Button
                        variant='contained'
                        size='small'
                        onClick={() => handleDownload({checksum, filename})}
                      >
                        Télécharger
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant='body2'>
            <i>Aucun document</i>
          </Typography>
        )}
      </Box>
    </Box>
  )
}

const ModalSection = ({children}) => (
  <Box className='bg-slate-50 p-1'>
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
      <DossierInfo {...selectedDossier} />

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

