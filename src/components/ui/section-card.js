import {fr} from '@codegouvfr/react-dsfr'
import Button from '@codegouvfr/react-dsfr/Button'
import {Box, Typography} from '@mui/material'

const SectionCard = ({title, icon, buttonProps, children}) => (
  <Box sx={{
    flex: 1,
    p: 2,
    border: '1px solid',
    borderColor: fr.colors.decisions.border.default.grey.default
  }}
  >
    <Box className='mt-2'>
      <Box className='flex justify-between items-center mb-2'>
        <Typography variant='h6' className='flex items-center gap-1'>
          <Box className='flex items-center gap-2'>
            <div className={icon} />
            {title}
          </Box>
        </Typography>

        {buttonProps && <Button {...buttonProps} />}
      </Box>
      {children}
    </Box>
  </Box>
)

export default SectionCard
