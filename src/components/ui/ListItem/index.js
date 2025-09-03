import {fr} from '@codegouvfr/react-dsfr'
import {Card} from '@codegouvfr/react-dsfr/Card'
import {Tooltip} from '@codegouvfr/react-dsfr/Tooltip'
import {Typography, Box} from '@mui/material'

import TagsList from '@/components/ui/TagsList/index.js'
import MetasList from '@/components/ui/MetasList/index.js'

const ListItem = ({
  background = 'primary',
  title,
  subtitle,
  subtitleIcon: SubtitleIcon,
  rightIcons,
  tags,
  metas,
  border
}) => {
  const CardTitle = () => (
    <Box>
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'
      }}
      >
        <Typography variant='h6' fontWeight='bold'>{title || ''}</Typography>
        {Array.isArray(rightIcons) && rightIcons.length > 0 && (
          <Box sx={{display: 'flex', gap: 1}}>
            {rightIcons.map(({label, icon: Icon}, index) =>
              Icon && (
                <Tooltip key={label || index} title={label || ''}>
                  <Icon />
                </Tooltip>
              )
            )}
          </Box>
        )}
      </Box>

      {subtitle && (
        <Typography
          variant='body2'
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: fr.colors.decisions.text.disabled.grey.default,
            gap: 0.5
          }}
        >
          {SubtitleIcon && <SubtitleIcon sx={{fontSize: 16}} />}
          {subtitle}
        </Typography>
      )}
    </Box>
  )

  return (
    <Card
      start={<TagsList tags={tags} />}
      title={<CardTitle />}
      end={<MetasList metas={metas} />}
      border={border || false}
      size='small'
      style={{
        backgroundColor:
          background === 'primary'
            ? fr.colors.decisions.background.default.grey.default
            : fr.colors.decisions.background.alt.blueFrance.default
      }}
    />
  )
}

export default ListItem
