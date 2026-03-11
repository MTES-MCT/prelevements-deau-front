import {useMemo} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import Badge from '@codegouvfr/react-dsfr/Badge'
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import {
  Box,
  Stack,
  Tooltip,
  Typography
} from '@mui/material'
import moment from 'moment'
import 'moment/locale/fr'

export const CHUNK_STATUS = {
  PENDING: {
    label: 'Volumes à instruire',
    instructionLabel: 'À instruire',
    severity: 'info',
    icon: ScheduleOutlinedIcon,
    color: fr.colors.decisions.border.plain.info.default,
    text: fr.colors.decisions.text.default.info,
    selectable: true
  },
  REJECTED: {
    label: 'Volumes refusés',
    instructionLabel: 'Refusé',
    severity: 'error',
    icon: HighlightOffOutlinedIcon,
    color: fr.colors.decisions.border.plain.error.default,
    text: fr.colors.decisions.text.default.error,
    selectable: true
  },
  VALIDATED: {
    label: 'Volumes validés',
    instructionLabel: 'Validé',
    severity: 'success',
    icon: TaskAltOutlinedIcon,
    color: fr.colors.decisions.border.plain.success.default,
    text: fr.colors.decisions.text.default.success,
    selectable: true
  },
  AUTOMATICALLY_VALIDATED: {
    label: 'Volumes validés (auto)',
    severity: 'success',
    icon: TaskAltOutlinedIcon,
    color: fr.colors.decisions.border.plain.success.default,
    text: fr.colors.decisions.text.default.success,
    selectable: false
  }
}

const ChunkInstructionBadge = ({
  instructionStatus,
  instructionComment,
  instructedAt,
  instructedBy,
  displayTooltip
}) => {
  const instructedByName = useMemo(() => {
    if (!instructedBy) {
      return null
    }

    return [instructedBy?.firstName, instructedBy?.lastName]
      .filter(Boolean)
      .join(' ')
  }, [instructedBy])

  const instructedAtFormatted = useMemo(() => {
    if (!instructedAt) {
      return null
    }

    return moment(instructedAt).format('LLL')
  }, [instructedAt])

  const statusConfig = instructionStatus ? CHUNK_STATUS[instructionStatus] : null

  if (!statusConfig) {
    return null
  }

  const tooltipContent = (
    <Box sx={{p: 1}}>
      <Stack spacing={1}>
        {(instructedAt || instructedBy) && (
          <Box>
            <Typography variant='caption' sx={{opacity: 0.8, display: 'block'}}>
              Instruction
            </Typography>
            <Typography variant='body2'>
              {[
                instructedAtFormatted || null,
                instructedByName || null
              ].filter(Boolean).join(' • ')}
            </Typography>
          </Box>
        )}

        {instructionComment && (
          <Stack direction='row' spacing={0.75} alignItems='flex-start'>
            <Box>
              <Typography variant='caption' sx={{opacity: 0.8, display: 'block'}}>
                Commentaire
              </Typography>
              <Typography
                variant='body2'
                sx={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.35
                }}
              >
                {instructionComment}
              </Typography>
            </Box>
          </Stack>
        )}
      </Stack>
    </Box>
  )

  return (
    <Tooltip
      arrow
      title={tooltipContent}
      placement='top'
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: fr.colors.decisions.background.default.grey.default,
            color: fr.colors.decisions.text.default.grey.default,
            border: '1px solid',
            borderColor: fr.colors.decisions.border.default.grey.default,
            boxShadow: 3,
            maxWidth: 360,
            p: 1.25
          }
        },
        arrow: {
          sx: {
            color: fr.colors.decisions.background.default.grey.default
          }
        }
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          cursor: 'help'
        }}
      >
        <Box
          sx={{
            transform: 'scale(0.84)',
            transformOrigin: 'right center'
          }}
        >
          <Badge severity={statusConfig.severity}>
            {statusConfig.label}
          </Badge>
        </Box>

        { displayTooltip && (
          <InfoOutlinedIcon
            sx={{
              fontSize: 16,
              color: fr.colors.decisions.text.mention.grey.default
            }}
          />
        ) }
      </Box>
    </Tooltip>
  )
}

export default ChunkInstructionBadge
