import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/system'
import uniqBy from 'lodash-es/uniqBy'

const MetasList = ({metas = []}) => {
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
      {uniqueMetas.map(({content, icon: Icon}, idx) => (
        <Box
          key={content || idx}
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
              title={Icon.displayName || Icon.name}
              aria-label={Icon.displayName || Icon.name}
            />
          )}
          {content}
        </Box>
      ))}
    </Box>
  )
}

export default MetasList
