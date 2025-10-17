import {fr} from '@codegouvfr/react-dsfr'
import Button from '@codegouvfr/react-dsfr/Button'
import {Box, Typography} from '@mui/material'

const ALERTES_STYLE = {
  info: {icon: 'fr-icon-checkbox-fill', color: fr.colors.decisions.text.active.blueFrance.default},
  success: {icon: 'fr-icon-success-fill', color: fr.colors.decisions.text.default.success.default},
  warning: {icon: 'fr-icon-warning-fill', color: fr.colors.decisions.text.default.warning.default},
  error: {icon: 'fr-icon-error-fill', color: fr.colors.decisions.text.default.error.default}
}

const ResumeCard = ({alertType, label, value, hint, actionLabel, handleClick, ...buttonProps}) => {
  const alertStyle = ALERTES_STYLE[alertType] || ALERTES_STYLE.info

  return (
    <Box
      sx={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px',
        border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
        minWidth: '300px'
      }}
    >
      <Box className='flex items-center gap-1'>
        <span className={alertStyle.icon} style={{color: alertStyle.color}} />
        <Typography className='fr-text--lg' fontWeight='bold'>{label}</Typography>
      </Box>

      <Box className='flex flex-col items-center'>
        <Typography variant='h3' sx={{color: alertStyle.color}}>{value}</Typography>
        <Typography fontWeight='light' variant='subtitle2'>{hint}</Typography>
      </Box>

      {actionLabel && (
        <Button
          priority='tertiary'
          style={{
            display: 'flex', justifyContent: 'center', width: '100%'
          }}
          onClick={handleClick}
          {...buttonProps}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}

export default ResumeCard
