import {Box, Checkbox} from '@mui/material'
import {useTheme} from '@mui/material/styles'

const Filters = ({layout, setFilters}) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 10,
        left: 10,
        px: 2,
        py: 1,
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        zIndex: 1
      }}
    >
      Masquer :
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {layout === 'typesMilieu' && (
          <>
            <Box>
              <Checkbox
                sx={{p: 0}}
                size='small'
                label='Eau de surface'
                onChange={() => setFilters('Eau de surface')}
              /> Eau de surface
            </Box>
            <Box>
              <Checkbox
                sx={{p: 0}}
                size='small'
                label='Eau souterraine'
                onChange={() => setFilters('Eau souterraine')}
              /> Eau souterraine
            </Box>
          </>
        )}
        {layout === 'usages' && (
          <>
            <Box>
              <Checkbox
                sx={{p: 0}}
                size='small'
                label='Eau potable'
                onChange={() => setFilters('Eau potable')}
              /> Eau potable
            </Box>
            <Box>
              <Checkbox
                sx={{p: 0}}
                size='small'
                label='Agriculture'
                onChange={() => setFilters('Agriculture')}
              /> Agriculture
            </Box>
            <Box>
              <Checkbox
                sx={{p: 0}}
                size='small'
                label='Camion citerne'
                onChange={() => setFilters('Camion citerne')}
              /> Camion citerne
            </Box>
            <Box>
              <Checkbox
                sx={{p: 0}}
                size='small'
                label='Eau embouteillée'
                onChange={() => setFilters('Eau embouteillée')}
              /> Eau embouteillée
            </Box>
            <Box>
              <Checkbox
                sx={{p: 0}}
                size='small'
                label='Hydroélectricité'
                onChange={() => setFilters('Hydroélectricité')}
              /> Hydroélectricité
            </Box>
            <Box>
              <Checkbox
                sx={{p: 0}}
                size='small'
                label='Industrie'
                onChange={() => setFilters('Industrie')}
              /> Industrie
            </Box>
            <Box>
              <Checkbox
                sx={{p: 0}}
                size='small'
                label='Thermalisme'
                onChange={() => setFilters('Thermalisme')}
              /> Thermalisme
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}

export default Filters
