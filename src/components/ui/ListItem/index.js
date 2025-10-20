import {fr} from '@codegouvfr/react-dsfr'
import {Card} from '@codegouvfr/react-dsfr/Card'
import {Tooltip} from '@codegouvfr/react-dsfr/Tooltip'
import {Typography, Box} from '@mui/material'

import MetasList from '@/components/ui/MetasList/index.js'
import TagsList from '@/components/ui/TagsList/index.js'
import './style.css'

const CardTitle = ({title, subtitle, subtitleIcon: SubtitleIcon, rightIcons}) => (
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

const primaryBackgroundStyle = {
  backgroundColor: fr.colors.decisions.background.default.grey.default
}

const secondaryBackgroundStyle = {
  backgroundColor: fr.colors.decisions.background.alt.blueFrance.default
}

const ListItem = ({
  background = 'primary',
  title,
  subtitle,
  subtitleIcon,
  rightIcons,
  tags,
  metas,
  border
}) =>
  (
    <Card
      start={<TagsList tags={tags} />}
      title={<CardTitle title={title} subtitle={subtitle} subtitleIcon={subtitleIcon} rightIcons={rightIcons} />}
      end={metas?.length > 0 ? <Box className='mt-2'><MetasList metas={metas} /></Box> : null}
      border={border || false}
      size='small'
      style={background === 'primary' ? primaryBackgroundStyle : secondaryBackgroundStyle}
    />
  )

export default ListItem
