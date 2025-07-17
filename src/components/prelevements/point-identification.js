import {Button} from '@codegouvfr/react-dsfr/Button'
import Article from '@mui/icons-material/Article'
import Launch from '@mui/icons-material/Launch'
import {Box, Chip, Typography} from '@mui/material'
import Link from 'next/link'

import {getTypeMilieuColor} from '@/lib/points-prelevement.js'

const PointIdentification = ({pointPrelevement, lienBss, lienBnpe}) => {
  const {id_point: idPoint, nom} = pointPrelevement

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex justify-between items-center gap-4 pb-2'>
        <Typography variant='h3'>
          <div className='flex flex-wrap items-center gap-4'>
            {idPoint} - {nom} {pointPrelevement.exploitationsStatus && (
              <small className='fr-badge fr-badge--success fr-badge--no-icon'>{pointPrelevement.exploitationsStatus}</small>
            )}
          </div>
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
        <Box className='flex items-center gap-1'>
          <b>Type de milieu :</b>
          <Chip
            size='small'
            label={pointPrelevement.type_milieu}
            sx={{
              backgroundColor: getTypeMilieuColor(pointPrelevement.type_milieu).background,
              color: getTypeMilieuColor(pointPrelevement.type_milieu).textColor
            }}
          />
        </Box>
      )}

      <div className='flex flex-col gap-1'>
        {lienBss && (
          <Box className='flex gap-1'>
            <Article />
            <b>Fiche BSS InfoTerre : </b>
            <Link href={lienBss}>{lienBss}</Link>
            <Launch />
          </Box>
        )}
        {lienBnpe && (
          <Box className='flex gap-1'>
            <Article />
            <b>Fiche ouvrage BNPE : </b>
            <Link href={lienBnpe}>{lienBnpe}</Link>
            <Launch />
          </Box>
        )}
      </div>
    </div>
  )
}

export default PointIdentification
