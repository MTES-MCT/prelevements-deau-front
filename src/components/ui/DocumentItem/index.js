import {fr} from '@codegouvfr/react-dsfr'
import Button from '@codegouvfr/react-dsfr/Button'
import Tooltip from '@codegouvfr/react-dsfr/Tooltip'
import {Typography, Box} from '@mui/material'

import {RequireEditor} from '@/components/permissions/index.js'

const DocumentItem = ({title, subtitle, info, background = 'primary', onDelete, onEdit, viewUrl}) => (
  <Box
    sx={{
      width: '100%',
      padding: 2,
      border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      backgroundColor: background === 'primary' ? fr.colors.decisions.background.default.grey.default : fr.colors.decisions.background.alt.blueFrance.default
    }}
  >
    <Box className='flex flex-col gap-1'>
      <Box className='flex items-center gap-1'>
        <Typography fontWeight='medium' variant='body1'>{title}</Typography>
        {info && <Tooltip kind='hover' title={info} />}
      </Box>

      <Typography variant='body2'>{subtitle}</Typography>
    </Box>

    <Box>
      <RequireEditor>
        {onEdit && (
          <Button
            iconId='fr-icon-edit-line'
            priority='tertiary no outline'
            aria-label='Éditer le document'
            size='small'
            onClick={onEdit}
          />
        )}
        {onDelete && (
          <Button
            iconId='fr-icon-delete-bin-line'
            priority='tertiary no outline'
            aria-label='Supprimer le document'
            size='small'
            style={{color: fr.colors.decisions.text.default.error.default}}
            onClick={onDelete}
          />
        )}
      </RequireEditor>
      {viewUrl && (
        <Button
          iconId='fr-icon-external-link-line'
          priority='tertiary no outline'
          aria-label='Voir le document'
          linkProps={{href: viewUrl, target: '_blank', rel: 'noopener noreferrer'}}
          size='small'
        />
      )}
    </Box>
  </Box>
)

export default DocumentItem
