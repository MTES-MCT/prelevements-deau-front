import {Box} from '@mui/material'
import {useTheme} from '@mui/material/styles'

const Bubble = ({color, text}) => (
  <Box sx={{display: 'flex', alignItems: 'center'}}>
    <Box
      sx={{
        height: 15,
        width: 15,
        backgroundColor: color,
        border: '1px solid black',
        borderRadius: '50%',
        mr: 1
      }}
    />
    <Box>{text}</Box>
  </Box>
)

const Legend = ({legend}) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        px: 2,
        py: 1,
        borderRadius: 2,
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary
      }}
    >
      <Box sx={{pb: 2}}>Légende :</Box>
      <Box
        sx={{
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary
        }}
      >
        {legend === 'usages' && (
          <>
            <Bubble
              color='deepskyblue'
              text='Eau potable'
            />
            <Bubble
              color='lawngreen'
              text='Agriculture'
            />
            <Bubble
              color='grey'
              text='Camion citerne'
            />
            <Bubble
              color='skyblue'
              text='Eau embouteillée'
            />
            <Bubble
              color='steelblue'
              text='Hydroélectricité'
            />
            <Bubble
              color='slategrey'
              text='Industrie'
            />
            <Bubble
              color='lightgrey'
              text='Non renseigné'
            />
            <Bubble
              color='lightseagreen'
              text='Thermalisme'
            />
          </>
        )}
        {legend === 'typesMilieu' && (
          <>
            <Bubble
              color='deepskyblue'
              text='Eau de surface'
            />
            <Bubble
              color='lightseagreen'
              text='Eau souterraine'
            />
          </>
        )}
      </Box>
    </Box>
  )
}

export default Legend
