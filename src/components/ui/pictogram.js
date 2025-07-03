import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/system'
import Image from 'next/image'

const Pictogram = ({pictoName}) => (
  <Box sx={{
    borderRadius: '100%',
    backgroundColor: fr.colors.options.grey._975_100.default,
    padding: 2,
    width: 'fit-content'
  }}
  >
    <Image
      width={100}
      height={100}
      src={`/images/assets/pictograms/${pictoName}.svg`}
      alt=''
    />
  </Box>
)

export default Pictogram
