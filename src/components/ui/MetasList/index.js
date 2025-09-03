import {useMemo} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/system'

const MetasList = ({metas = []}) => {
  // Éviter les doublons
  const uniqueMetas = useMemo(() => [...new Map(metas.map(meta => [meta.content, meta])).values()], [metas])

  if (uniqueMetas.length === 0) {
    return null
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}
    >
      {uniqueMetas.map(({content, icon: Icon}) => {
        const iconName = Icon?.displayName || Icon?.name || 'noicon'
        const key = `${iconName}-${content ?? 'nocontent'}`

        if (!content && !Icon) {
          return null
        }

        return (
          <Box
            key={key}
            sx={{
              color: fr.colors.decisions.text.disabled.grey.default,
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            {Icon && (
              <Icon
                sx={{fontSize: 18, color: fr.colors.decisions.text.default.grey.default}}
                title={iconName}
                aria-label={iconName}
              />
            )}
            {content}
          </Box>
        )
      })}
    </Box>
  )
}

export default MetasList
