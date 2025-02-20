import {Button} from '@codegouvfr/react-dsfr/Button'
import {FolderOpen} from '@mui/icons-material'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material'

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

export default FilesDetails
