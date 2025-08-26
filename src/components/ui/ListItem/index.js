import {fr} from '@codegouvfr/react-dsfr'
import {Badge} from '@codegouvfr/react-dsfr/Badge'
import {Card} from '@codegouvfr/react-dsfr/Card'
import {Tooltip} from '@codegouvfr/react-dsfr/Tooltip'
import {Typography, Box} from '@mui/material'

const ListItem = ({background = 'primary', title, subtitle, subtitleIcon: SubtitleIcon, rightIcons, tags, metas}) => {
  const TagsList = () => {
    if (!tags || tags.length === 0) {
      return null
    }

    return (
      <ul className='fr-badges-group'>
        {tags.map(tag => (
          <li key={tag.label}>
            <Badge severity={tag.severity}>{tag.label}</Badge>
          </li>
        ))}
      </ul>
    )
  }

  const CardTitle = () => (
    <Box>
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'
      }}
      >
        <Typography variant='h6' fontWeight='bold'>{title}</Typography>
        {rightIcons && <Box sx={{display: 'flex', gap: 1}}>
          {rightIcons.map(({label, icon: Icon}) => (
            <Tooltip key={label} title={label}>
              <Icon />
            </Tooltip>
          ))}
        </Box>}
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

  const Metas = () => {
    if (!metas || metas.length === 0) {
      return null
    }

    return (
      <Box sx={{
        display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center'
      }}
      >
        {metas.map(({content, icon: Icon}) => (
          <Typography
            key={content}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: fr.colors.decisions.text.disabled.grey.default
            }}
          >
            <Icon sx={{fontSize: 18, color: fr.colors.decisions.text.default.grey.default}} />
            {content}
          </Typography>
        ))}
      </Box>
    )
  }

  return (
    <Card
      start={<TagsList />}
      title={<CardTitle />}
      end={<Metas />}
      border={false}
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
