import {fr} from '@codegouvfr/react-dsfr'
import {Box, Typography} from '@mui/material'

const icons = {
  info: 'fr-icon-info-fill',
  warning: 'fr-icon-warning-fill',
  error: 'fr-icon-error-fill',
  missing: 'fr-icon-close-circle-fill'
}

const colors = {
  info: fr.colors.decisions.text.default.info.default,
  warning: fr.colors.decisions.text.default.warning.default,
  error: fr.colors.decisions.text.default.error.default,
  missing: fr.colors.decisions.text.mention.grey.default
}

const CompactAlert = ({label, alertType = 'info'}) => {
  const type = icons[alertType] ? alertType : 'info'

  return (
    <Box className='flex items-center gap-1' role='alert'>
      <span
        className={icons[type]}
        aria-hidden='true'
        style={{color: colors[type]}}
      />
      <Typography variant='body2'>{label}</Typography>
    </Box>
  )
}

export default CompactAlert
