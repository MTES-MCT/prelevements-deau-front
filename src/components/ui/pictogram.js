import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/system'

const Pictogram = ({pictogram: PictogramComponent}) => (
  <Box
    sx={{
      borderRadius: '100%',
      backgroundColor: fr.colors.options.grey._975_100.default,
      padding: 2,
      width: 'fit-content'
    }}
  >
    <PictogramComponent width={100} height={100} />
  </Box>
)

export default Pictogram
