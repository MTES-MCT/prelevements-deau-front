import {Box} from '@mui/material'

const Popup = ({properties}) => (
  <Box>
    <h3 className='text-base text-black font-bold'>{properties.nom || 'Pas de nom renseigné'}</h3>
  </Box>
)

export default Popup
