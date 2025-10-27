import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/system'
import uniqBy from 'lodash-es/uniqBy'

import Icon from '@/components/ui/Icon/index.js'

const MetasList = ({metas = [], size = 'md'}) => {
  const uniqueMetas = uniqBy(metas, 'content')

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}
    >
      {uniqueMetas.map(({content, icon, iconId}, idx) => (
        <Box
          key={content || idx}
          sx={{
            color: fr.colors.decisions.text.disabled.grey.default,
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: size === 'sm' ? 14 : 16
          }}
        >
          {
            (icon || iconId)
            && <Icon iconId={iconId} iconElement={icon}
              sx={{fontSize: size === 'sm' ? 16 : 18, color: fr.colors.decisions.text.default.grey.default}}
              title={icon?.displayName || icon?.name}
              aria-label={icon?.displayName || icon?.name}
            />
          }

          {content}
        </Box>
      ))}
    </Box>
  )
}

export default MetasList
