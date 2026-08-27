import {fr} from '@codegouvfr/react-dsfr'
import {Button} from '@codegouvfr/react-dsfr/Button'
import Tooltip from '@codegouvfr/react-dsfr/Tooltip'
import {Article} from '@mui/icons-material'
import {Box, Typography} from '@mui/material'

import formatDate from '@/lib/format-date.js'

const formatExploitations = exploitations => {
  const names = [...new Set(exploitations.map(exploitation =>
    exploitation.point?.name || exploitation.pointPrelevement?.name
  ).filter(Boolean))]

  if (names.length > 0) {
    return names.join(', ')
  }

  return exploitations.length > 0
    ? `${exploitations.length} exploitation${exploitations.length > 1 ? 's' : ''}`
    : null
}

const Document = ({document, exploitations = [], handleDelete, handleEdit, ...props}) => {
  const linkedIds = new Set(
    document.declarantPointPrelevementIds
      ?? document.exploitations?.map(({id, declarantPointPrelevementId}) => declarantPointPrelevementId ?? id)
      ?? (document.declarantPointPrelevementId ? [document.declarantPointPrelevementId] : [])
  )
  const linkedExploitations = exploitations.filter(exploitation => linkedIds.has(exploitation.id))
  const exploitationText = formatExploitations(linkedExploitations)

  return (
    <Box
      key={document.id}
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
          {document.nature} {document.reference ? `- n°${document.reference}` : ''} du {formatDate(document.signatureDate)}
          {document.comment && (
            <span style={{padding: '.5em'}}>
              <Tooltip kind='hover' title={document.comment} />
            </span>
          )}
        </Typography>

        {document.validityEndDate && (
          <Typography variant='caption' sx={{pl: 2}}>
            <i>(Fin de validité : {formatDate(document.validityEndDate)})</i>
          </Typography>
        )}

        {exploitationText && (
          <Typography variant='caption' sx={{pl: 2, display: 'block'}}>
            <i>{exploitationText}</i>
          </Typography>
        )}

        {(document.title || document.filename) && (
          <Typography variant='caption' sx={{pl: 2, display: 'block'}}>
            <i>{document.title || document.filename}</i>
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
              onClick={() => handleEdit(document.id)}
            />
          )}
          {handleDelete && (
            <Button
              iconId='fr-icon-delete-line'
              priority='tertiary no outline'
              size='small'
              style={{color: fr.colors.decisions.text.active.redMarianne.default}}
              onClick={() => handleDelete(document.id)}
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
