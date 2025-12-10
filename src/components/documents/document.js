import {fr} from '@codegouvfr/react-dsfr'
import {Button} from '@codegouvfr/react-dsfr/Button'
import Tooltip from '@codegouvfr/react-dsfr/Tooltip'
import {Article} from '@mui/icons-material'
import {Box, Typography} from '@mui/material'

import formatDate from '@/lib/format-date.js'

// Format exploitations count for display
const formatExploitationsCount = exploitations => {
  if (!exploitations || exploitations.length === 0) {
    return null
  }

  if (exploitations.length === 1) {
    const exploitation = exploitations[0]
    return exploitation.point?.nom || exploitation.point?.id_point || '1 exploitation'
  }

  return `${exploitations.length} exploitations`
}

const Document = ({document, exploitations = [], handleDelete, handleEdit, ...props}) => {
  // Find exploitations that reference this document
  const linkedExploitations = exploitations.filter(e =>
    e.documents?.some(d => (d._id || d) === document._id)
  )
  const exploitationsText = formatExploitationsCount(linkedExploitations)

  return (
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
        {exploitationsText && (
          <Typography variant='caption' sx={{pl: 2, display: 'block'}}>
            <i>{exploitationsText}</i>
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
              iconId='fr-icon-edit-line'
              priority='tertiary no outline'
              size='small'
              onClick={() => handleEdit(document._id)}
            />
          )}
          {handleDelete && (
            <Button
              iconId='fr-icon-delete-line'
              priority='tertiary no outline'
              size='small'
              style={{color: fr.colors.decisions.text.active.redMarianne.default}}
              onClick={() => handleDelete(document._id)}
            />
          )}
          {document.downloadUrl && (
            <Button
              iconId='fr-icon-external-link-line'
              priority='tertiary no outline'
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
}

export default Document
