import {fr} from '@codegouvfr/react-dsfr'
import {Button} from '@codegouvfr/react-dsfr/Button'
import Tooltip from '@codegouvfr/react-dsfr/Tooltip'
import {Article} from '@mui/icons-material'
import {Box, Typography} from '@mui/material'

import formatDate from '@/lib/format-date.js'

const Document = ({document, handleDelete, handleEdit, ...props}) => (
  <Box
    key={document._id}
    {...props}
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between'
    }}
  >
    <Box sx={{display: 'flex', flexDirection: 'column', p: 2}}>
      <Typography sx={{pr: 1}}>
        <Article
          sx={{
            pr: 1,
            verticalAlign: 'bottom',
            color: fr.colors.decisions.text.actionHigh.blueFrance.default
          }}
        />
        {document.nature} {document.reference ? `- n°${document.reference}` : ''} du {formatDate(document.date_signature)}
        {document.remarque && (
          <span style={{padding: '.5em'}}>
            <Tooltip kind='hover' title={document.remarque} />
          </span>
        )}
      </Typography>
      {document.date_fin_validite && (
        <Typography variant='caption' sx={{pl: 2}}>
          <i>(Fin de validité : {formatDate(document.date_fin_validite)})</i>
        </Typography>
      )}
    </Box>
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '.5em'
      }}
    >
      <Box>
        {handleEdit && (
          <Button
            priority='tertiary no outline'
            iconId='fr-icon-edit-line'
            size='small'
            onClick={() => handleEdit(document._id)}
          />
        )}
        {handleDelete && (
          <Button
            priority='tertiary no outline'
            iconId='fr-icon-delete-line'
            size='small'
            style={{color: fr.colors.decisions.text.active.redMarianne.default}}
            onClick={() => handleDelete(document._id)}
          />
        )}
        {document.downloadUrl && (
          <Button
            priority='tertiary no outline'
            iconId='fr-icon-external-link-line'
            size='small'
            linkProps={{
              href: document.downloadUrl
            }}
          />
        )}
      </Box>
    </Box>
  </Box>
)

export default Document
