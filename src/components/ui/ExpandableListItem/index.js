import {useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/system'

import LabelWithIcon from '@/components/ui/LabelWithIcon/index.js'
import MetasList from '@/components/ui/MetasList/index.js'
import TagsList from '@/components/ui/TagsList/index.js'

const ExpandableListItem = ({icon, iconId, label, tags, metas, background = 'primary', children}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Box
      sx={{
        width: '100%',
        padding: 2,
        border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
        backgroundColor: background === 'primary' ? fr.colors.decisions.background.default.grey.default : fr.colors.decisions.background.alt.blueFrance.default
      }}
    >
      <Box
        role='button'
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Réduire' : 'Développer'}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
      >
        <Box className='w-full flex items-center justify-between gap-2'>
          <Box className='w-full flex flex-wrap justify-between items-center gap-2'>
            <LabelWithIcon icon={icon} iconId={iconId}>
              {label}
            </LabelWithIcon>

            {tags?.length > 0 && <TagsList tags={tags} />}
          </Box>
          <span aria-hidden='true' className={isOpen ? 'fr-icon-arrow-down-s-line' : 'fr-icon-arrow-right-s-line'} />
        </Box>

        {metas?.length > 0 && <MetasList metas={metas} />}
      </Box>

      {isOpen && <Box className='mt-8'>{children}</Box>}
    </Box>
  )
}

export default ExpandableListItem
