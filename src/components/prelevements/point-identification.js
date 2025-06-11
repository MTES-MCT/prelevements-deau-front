import {Button} from '@codegouvfr/react-dsfr/Button'
import Article from '@mui/icons-material/Article'
import Launch from '@mui/icons-material/Launch'
import {Box, Chip, Typography} from '@mui/material'
import Link from 'next/link'

const PointIdentification = ({pointPrelevement, lienBss, lienBnpe}) => {
  const {id_point: idPoint, nom} = pointPrelevement

  return (
    <Box sx={{p: 3}}>
      <div className='flex justify-between'>
        <Typography
          gutterBottom
          variant='h3'
          sx={{pb: 1}}
        >
          {idPoint} - {nom} {pointPrelevement.exploitationsStatus && (
            <small className='fr-badge fr-badge--success fr-badge--no-icon fr-ml-2w'>{pointPrelevement.exploitationsStatus}</small>
          )}
        </Typography>
        <div>
          <Button
            priority='secondary'
            iconId='fr-icon-edit-line'
            linkProps={{
              href: `/prelevements/${idPoint}/edit`
            }}
          >
            Éditer
          </Button>
        </div>
      </div>
      {pointPrelevement.type_milieu && (
        <Box sx={{py: 2}}>
          <b>Type de milieu :</b> <Chip size='small' label={pointPrelevement.type_milieu} />
        </Box>
      )}
      {lienBss && (
        <Box sx={{mt: 2}}>
          <Article sx={{mr: 1}} />
          <b>Fiche BSS InfoTerre : </b>
          <Link sx={{m: 2}} href={lienBss}>{lienBss}</Link>
          <Launch sx={{ml: 1}} />
        </Box>
      )}
      {lienBnpe && (
        <Box>
          <Article sx={{mr: 1}} />
          <b>Fiche ouvrage BNPE : </b>
          <Link sx={{m: 2}} href={lienBnpe}>{lienBnpe}</Link>
          <Launch sx={{ml: 1}} />
        </Box>
      )}
    </Box>
  )
}

export default PointIdentification
