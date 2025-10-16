import {fr} from '@codegouvfr/react-dsfr'
import {Box, Typography} from '@mui/material'

const InfoBox = ({icon, label, description}) => {
  if (!label || !description) {
    return null
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 15px 5px 10px',
        gap: '5px',
        border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
        backgroundColor: fr.colors.decisions.background.default.grey.default
      }}
    >

      {icon && (
        <span style={{color: fr.colors.decisions.text.label.blueFrance.default}}>
          {icon}
        </span>
      )}

      <Box className='flex items-center gap-1'>
        <Typography fontWeight='bold' variant='body1'>{label} :</Typography>
        <Typography>{description}</Typography>
      </Box>
    </Box>
  )
}

export default InfoBox
