import {fr} from '@codegouvfr/react-dsfr'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography, Box} from '@mui/material'
import Link from 'next/link'

const BorderedSection = ({title, linkPath, handleAction, icon, buttonLabel, children}) => (
  <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
    <Box className='flex justify-between items-center flex-wrap gap-1'>
      <Typography variant='h6'>{title}</Typography>
      {handleAction ? (
        <Button
          priority='secondary'
          iconId={`fr-icon-${icon}`}
          onClick={handleAction}
        >
          {buttonLabel}
        </Button>
      ) : (
        <Link href={linkPath} className='fr-btn fr-btn--secondary'>
          <span className={`fr-icon-${icon}`} />
          {buttonLabel}
        </Link>
      )}
    </Box>

    <Box sx={{border: `1px solid ${fr.colors.decisions.border.default.grey.default}`, padding: 2}}>
      {children}
    </Box>
  </Box>
)

export default BorderedSection
