import {Person, WaterDropOutlined} from '@mui/icons-material'
import {
  Box,
  Chip,
  Typography,
  useTheme
} from '@mui/material'

import formatDate from '@/lib/format-date.js'

const Popup = ({point}) => {
  const theme = useTheme()
  const {nom, autresNoms, preleveurs, exploitationsStatus, exploitationsStartDate, usages, type_milieu: typeMilieu, zre, reservoir_biologique: reservoirBiologique} = point

  return (
    // TODO : Utiliser le theme DSFR
    <Box className='flex flex-col gap-2' sx={{color: theme.palette.text.primary}}>
      <Typography variant='h6' sx={{color: theme.palette.text.primary}}>
        {point.id_point} - {nom || 'Pas de nom renseigné'}
      </Typography>

      <Typography variant='caption'>
        {autresNoms}
      </Typography>

      <Box>
        {preleveurs.length > 0 ? (
          preleveurs.length < 4 ? (
            preleveurs.map(preleveur => (
              <Box key={preleveur.id_beneficiaire} className='flex items-center gap-1'>
                <Person /> {preleveur?.raison_sociale || preleveur?.sigle || preleveur?.nom}
              </Box>
            ))
          ) : (
            <Box className='flex items-center gap-1'>
              <Person /> {preleveurs.length} préleveurs
            </Box>
          )
        ) : (
          <Typography variant='caption'>Aucun préleveur</Typography>
        )}
      </Box>

      <Box>
        <Box className='flex items-center gap-1'>
          <WaterDropOutlined />Statut de l’exploitation : {exploitationsStatus || 'non renseigné'}
        </Box>
        <Box className='flex items-center gap-1'>
          Exploité depuis le {formatDate(exploitationsStartDate)}
        </Box>
        <Box>
          Zonage réglementaire : <Typography variant='caption' display='inline'>
            {zre ? 'Zone de répartition des eaux' : (reservoirBiologique ? 'Réservoir biologique' : ' - ')}
          </Typography>
        </Box>
      </Box>

      <Box className='flex flex-col gap-1'>
        <Box className='flex gap-1'>
          {usages.map(usage => (
            <Chip
              key={usage}
              label={usage}
              size='small'
              variant='outlined' />
          ))}
        </Box>
        <Chip label={typeMilieu} size='small' />
      </Box>
    </Box>
  )
}

export default Popup
