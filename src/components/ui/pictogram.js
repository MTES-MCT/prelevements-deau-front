import {Box} from '@mui/system'

const Pictogram = ({pictogram: PictogramComponent}) => (
  <Box
    sx={{
      borderRadius: '100%',
      backgroundColor: 'var(--background-alt-raised-grey)',
      padding: 2,
      width: 'fit-content'
    }}
  >
    <PictogramComponent width={100} height={100} />
  </Box>
)

export default Pictogram
