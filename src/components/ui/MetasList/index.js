import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/system'

const MetasList = ({metas = []}) => (
  <Box sx={{
    display: 'flex',
    gap: 2,
    flexWrap: 'wrap',
    alignItems: 'center'
  }}
  >
    {metas.map(({content, icon: Icon, id}) =>
      (content || Icon) && (
        <Box
          key={id}
          sx={{
            color: fr.colors.decisions.text.disabled.grey.default,
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}
        >
          {Icon && <Icon sx={{fontSize: 18, color: fr.colors.decisions.text.default.grey.default}} />}
          {content ?? null}
        </Box>
      )
    )}
  </Box>
)

export default MetasList
