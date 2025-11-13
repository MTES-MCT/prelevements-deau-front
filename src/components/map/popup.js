import Badge from '@codegouvfr/react-dsfr/Badge'
import {
  Box, Chip,
  useTheme
} from '@mui/material'

import {severityMap} from '@/components/exploitations/exploitations-list-item.js'
import Icon from '@/components/ui/Icon/index.js'
import MetasList from '@/components/ui/MetasList/index.js'
import {formatFullDateFr} from '@/lib/format-date.js'
import {usageIcons} from '@/lib/points-prelevement.js'

const chipStyle = {
  backgroundColor: 'var(--background-action-low-blue-france)',
  color: 'var(--text-action-high-blue-france)',
  fontFamily: 'Marianne'
}

const Popup = ({point}) => {
  const theme = useTheme()
  const {
    nom,
    preleveurs,
    exploitationsStatus,
    exploitationsStartDate,
    usages,
    type_milieu: typeMilieu
  } = point

  const metas = [{
    content: `${preleveurs.length} préleveur${preleveurs.length > 1 ? 's' : ''}`,
    iconId: 'fr-icon-account-line'
  }, {
    content: `Exploité depuis le ${formatFullDateFr(exploitationsStartDate)}`,
    iconId: 'fr-icon-calendar-2-line'
  }]

  return (
    <Box className='flex flex-col gap-2' sx={{color: theme.palette.text.primary, fontFamily: 'Marianne'}}>
      <h6 className='font-bold text-sm' style={{color: theme.palette.text.primary}}>
        {point.id_point} - {nom || 'Pas de nom renseigné'}
      </h6>

      <MetasList metas={metas} size='sm' />

      <ul className='border p-4'>
        <li className='flex items-center gap-1'>
          <span className='fr-text--bold'>Statut :</span>
          <Badge small severity={severityMap[exploitationsStatus]}>{exploitationsStatus}</Badge>
        </li>
        <li className='flex items-center gap-1'>
          <span className='fr-text--bold'>Type d&apos;environnement :</span>
          <Chip
            label={typeMilieu}
            sx={chipStyle}
          />
        </li>
        <li className='flex items-center gap-1'>
          <span className='fr-text--bold'>Usages :</span><span>{usages.map(usage => (
            <Chip
              key={usage}
              label={<><Icon iconElement={usageIcons[usage]} style={{height: '0.7em'}} /> {usage}</>}
              sx={chipStyle}
            />
          ))}</span>
        </li>
      </ul>
    </Box>
  )
}

export default Popup
