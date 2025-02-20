import {Highlight} from '@codegouvfr/react-dsfr/Highlight'
import {Box, Typography} from '@mui/material'

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

export default DossierCommentaire
