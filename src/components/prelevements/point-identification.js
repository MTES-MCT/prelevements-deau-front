import Article from '@mui/icons-material/Article'
import Launch from '@mui/icons-material/Launch'
import {Box, Typography} from '@mui/material'
import Link from 'next/link'

const PointIdentification = ({pointPrelevement, lienBss, lienBnpe}) => {
  const {id_point: idPoint, nom, autresNoms} = pointPrelevement

  return (
    <Box sx={{m: 2, p: 3}}>
      <Typography
        gutterBottom
        variant='h3'
      >
        {idPoint} - {nom}
      </Typography>
      {autresNoms && (
        <div><i>{autresNoms}</i></div>
      )}
      {lienBss && (
        <Box sx={{mt: 2}}>
          <Article sx={{m: 1}} />
          <b>Fiche BSS InfoTerre : </b>
          <Link sx={{m: 2}} href={lienBss}>{lienBss}</Link>
          <Launch sx={{ml: 1}} />
        </Box>
      )}
      {lienBnpe && (
        <Box>
          <Article sx={{m: 1}} />
          <b>Fiche ouvrage BNPE : </b>
          <Link sx={{m: 2}} href={lienBnpe}>{lienBnpe}</Link>
          <Launch sx={{ml: 1}} />
        </Box>
      )}
    </Box>
  )
}

export default PointIdentification
