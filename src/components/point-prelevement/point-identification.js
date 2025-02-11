import Article from '@mui/icons-material/Article'
import Launch from '@mui/icons-material/Launch'
import {Box, Paper, Typography} from '@mui/material'
import Link from 'next/link'

import {formatAutresNoms} from '../../lib/points-prelevement.js'

const PointIdentification = ({pointPrelevement, lienInfoterre, lienOuvrageBnpe}) => (
  <Paper
    elevation={1}
    sx={{m: 2, p: 3}}
  >
    <Typography
      gutterBottom
      variant='h3'
    >
      {pointPrelevement.id_point} - {pointPrelevement.nom}
    </Typography>
    {pointPrelevement.autres_noms && (
      <div><i>{formatAutresNoms(pointPrelevement.autres_noms)}</i></div>
    )}
    {lienInfoterre && (
      <Box sx={{mt: 2}}>
        <Article sx={{m: 1}} />
        <b>Fiche BSS InfoTerre : </b>
        <Link sx={{m: 2}} href={lienInfoterre}>{lienInfoterre}</Link>
        <Launch sx={{ml: 1}} />
      </Box>
    )}
    {lienOuvrageBnpe && (
      <Box>
        <Article sx={{m: 1}} />
        <b>Fiche ouvrage BNPE : </b>
        <Link sx={{m: 2}} href={lienOuvrageBnpe}>{lienOuvrageBnpe}</Link>
        <Launch sx={{ml: 1}} />
      </Box>
    )}
  </Paper>
)

export default PointIdentification
