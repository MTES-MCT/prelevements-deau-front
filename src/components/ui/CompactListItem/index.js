
import {fr} from '@codegouvfr/react-dsfr'
import Button from '@codegouvfr/react-dsfr/Button'
import Tooltip from '@codegouvfr/react-dsfr/Tooltip'
import {Box} from '@mui/system'

import LabelWithIcon from '@/components/ui/LabelWithIcon/index.js'
import MetasList from '@/components/ui/MetasList/index.js'
import TagsList from '@/components/ui/TagsList/index.js'

const CompactListItem = ({label, metas, tags, hint, icon, iconId, actions, background}) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'top',
      width: '100%',
      padding: 2,
      border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
      backgroundColor: background === 'primary' ? fr.colors.decisions.background.default.grey.default : fr.colors.decisions.background.alt.blueFrance.default
    }}
  >
    <Box className='flex flex-col gap-1'>
      <Box className='w-full flex items-center justify-between gap-2'>
        <Box className='flex gap-2 items-center'>
          <Box className='flex items-center gap-1'>
            <LabelWithIcon icon={icon} iconId={iconId}>
              {label}
            </LabelWithIcon>
            {hint && <Tooltip title={hint} />}
          </Box>

          {tags?.length > 0 && <TagsList size='sm' tags={tags} />}
        </Box>
      </Box>

      {metas?.length > 0 && <MetasList metas={metas} size='sm' />}
    </Box>

    <Box className='flex'>
      {actions && (
        actions.map(({title, iconId, type, onClick}) => (
          <Button
            key={title}
            iconId={iconId}
            priority='tertiary no outline'
            size='small'
            title={title}
            style={{color: type === 'danger' ? fr.colors.decisions.text.default.error.default : ''}}
            onClick={onClick}
          />
        ))
      )}
    </Box>
  </Box>
)

export default CompactListItem
