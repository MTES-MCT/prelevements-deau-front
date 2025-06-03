import {Article} from '@mui/icons-material'
import {Box, Typography} from '@mui/material'

import formatDate from '@/lib/format-date.js'

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
    <Box sx={{display: 'flex', flexDirection: 'column', p: 2}}>
      <Typography sx={{pr: 1}}>
        <Article sx={{pr: 1, verticalAlign: 'bottom', color: '#000091'}} />
        {document.nature} {document.reference ? `- n°${document.reference}` : ''} du {formatDate(document.date_signature)}
      </Typography>
      {document.date_fin_validite && (
        <Typography variant='caption' sx={{pl: 2}}>
          <i>(Fin de validité : {formatDate(document.date_fin_validite)})</i>
        </Typography>
      )}
      {document.remarque && (
        <Typography className='pl-3 pt-2'>
          <b>Remarque :</b> <i>{document.remarque}</i>
        </Typography>
      )}
    </Box>
    <Typography variant='caption' className='p-5'>
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
