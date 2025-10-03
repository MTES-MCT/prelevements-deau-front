import {Box, Divider} from '@mui/material'

const DividerSection = ({title, children}) => (
  <Box className='p-2 flex flex-col w-full gap-4'>
    <Divider sx={{mt: 4}} textAlign='left'>
      {title}
    </Divider>

    {children}
  </Box>
)

export default DividerSection
