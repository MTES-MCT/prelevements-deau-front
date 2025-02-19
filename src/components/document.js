import {Article} from '@mui/icons-material'
import {Box, Typography} from '@mui/material'
import {format} from 'date-fns'

const API_URL = process.env.NEXT_PUBLIC_STORAGE_URL

const Document = ({document}) => (
  <Box
    key={document.id_document}
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between'
    }}
  >
    <Box sx={{display: 'flex', flexDirection: 'column', p: 1}}>
      <Typography sx={{pr: 1}}>
        <Article sx={{pr: 1, verticalAlign: 'bottom'}} />
        {document.nature} - {document.reference} du {format(document.date_signature, 'dd/MM/yyyy')}
      </Typography>
      {document.date_fin_validite && (
        <Typography variant='caption' sx={{pl: 2}}>
          <i>(Fin de validité : {format(document.date_fin_validite, 'dd/MM/yyyy')})</i>
        </Typography>
      )}
      {document.remarque && (
        <Typography>Remarque : {document.remarque}</Typography>
      )}
    </Box>
    <Typography variant='caption'>
      <a
        href={`${API_URL}/document/${document.nom_fichier}`}
        target='_blank'
        rel='noreferrer'
      >
        Ouvrir le document
      </a>
    </Typography>
  </Box>
)

export default Document
