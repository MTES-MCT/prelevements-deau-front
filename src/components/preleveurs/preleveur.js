import {fr} from '@codegouvfr/react-dsfr'
import {
  Box,
  Chip,
  Typography
} from '@mui/material'
import Link from 'next/link'

import {getUsagesColors} from '@/components/map/legend-colors.js'

const Preleveur = ({preleveur, index}) => (
  <Link href={`preleveurs/${preleveur.id_preleveur}`}>
    <Box
      key={preleveur.id_preleveur}
      className='fr-p-2w flex justify-between items-top flex-wrap'
      sx={{
        backgroundColor: index % 2 === 0 ? fr.colors.decisions.background.default.grey.default : fr.colors.decisions.background.alt.blueFrance.default
      }}
    >
      <div className='flex flex-col'>
        <div className='flex gap-2'>
          <span
            className={`fr-icon--sm ${preleveur.raison_sociale ? 'fr-icon-building-line' : 'fr-icon-user-line'}`}
            style={{color: fr.colors.decisions.text.label.blueFrance.default}}
          />
          <span>{preleveur.civilite} {preleveur.nom} {preleveur.prenom} {preleveur.sigle} {preleveur.raison_sociale}</span>
        </div>
        <div className='flex gap-1'>
          <Typography className='fr-text--sm' fontWeight='bold'>{preleveur.exploitations.length}</Typography>
          <Typography className='fr-text--sm' fontWeight='light'>
            {preleveur.exploitations.length > 1 ? 'exploitations en vigueur' : 'exploitation en vigueur'}
          </Typography>
        </div>
      </div>

      <div>
        <b className='fr-text--sm'>Usages : </b>
        {preleveur.usages && preleveur.usages.length > 0 && preleveur.usages.map(u => (
          <Chip
            key={`${u}`}
            label={u}
            size='small'
            sx={{
              ml: 1,
              backgroundColor: getUsagesColors(u)?.color,
              color: getUsagesColors(u)?.textColor
            }}
          />
        ))}
      </div>
    </Box>
  </Link>
)

export default Preleveur
