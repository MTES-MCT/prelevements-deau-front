import {Button} from '@codegouvfr/react-dsfr/Button'
import Article from '@mui/icons-material/Article'
import Launch from '@mui/icons-material/Launch'
import {Box, Chip, Typography} from '@mui/material'

import {getTypeMilieuColor} from '@/lib/points-prelevement.js'

const LinkWithIcon = ({label, href}) => (
  <Box className='flex flex-wrap gap-1'>
    <Article />
    <b>{label} :</b>
    <span>
      <a className='mr-1' href={href}>{href}</a>
      <Launch />
    </span>
  </Box>
)

const PointIdentification = ({pointPrelevement, lienBss, lienBnpe}) => {
  const {id_point: idPoint, nom} = pointPrelevement

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex justify-between md:items-center sm:items-start gap-4 pb-2'>
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
          <LinkWithIcon
            href={lienBss}
            label='Fiche BSS InfoTerre'
          />
        )}
        {lienBnpe && (
          <LinkWithIcon
            href={lienBnpe}
            label='Fiche ouvrage BNPE'
          />
        )}
      </div>
    </div>
  )
}

export default PointIdentification
