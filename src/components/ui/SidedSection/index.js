import {fr} from '@codegouvfr/react-dsfr'
import {Box, Typography} from '@mui/material'
import Grid from '@mui/material/Grid2'

const SidedSection = ({
  title,
  subtitle,
  background = 'primary',
  firstContent,
  secondContent,
  children
}) => {
  const backgroundColor = background === 'secondary'
    ? fr.colors.decisions.background.alt.blueFrance.default
    : fr.colors.decisions.background.default.grey.default

  return (
    <Box sx={{backgroundColor, padding: 5}}>
      {(title || subtitle) && (
        <Box className='fr-container text-center pt-12'>
          {title && <Typography variant='h6'>{title}</Typography>}
          {subtitle && <Typography variant='body1' className='pt-4'>{subtitle}</Typography>}
        </Box>
      )}

      <Box className='fr-container mt-4' sx={{maxWidth: '1200px'}}>
        {(firstContent || secondContent) && (
          <Grid container spacing={4} sx={{mb: 5}}>
            {firstContent && (
              <Grid size={{xs: 12, md: 6}} display='flex' justifyContent='center' alignItems='center'>
                {firstContent}
              </Grid>
            )}
            {secondContent && (
              <Grid size={{xs: 12, md: 6}} display='flex' justifyContent='center' alignItems='center'>
                {secondContent}
              </Grid>
            )}
          </Grid>
        )}

        <Box className='flex justify-center fr-container'>{children}</Box>
      </Box>
    </Box>
  )
}

export default SidedSection
