import {fr} from '@codegouvfr/react-dsfr'
import Badge from '@codegouvfr/react-dsfr/Badge'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpacityOutlinedIcon from '@mui/icons-material/OpacityOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import WaterOutlinedIcon from '@mui/icons-material/WaterOutlined'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography
} from '@mui/material'

import ChunkInstructionBadge, {CHUNK_STATUS} from '@/components/declarations/instruction/chunk-instruction-badge.js'
import ChunkInstructionForm from '@/components/declarations/instruction/chunk-instruction-form.js'
import {formatNumber} from '@/utils/number.js'

const PrelevementsAccordion = ({
  pointPrelevementId,
  pointPrelevementName,
  suggestedPointPrelevementName,
  chunkId,
  sourceId,
  instructedAt,
  instructedBy,
  instructionStatus,
  instructionComment,
  availablePoints = [],
  volumePreleveTotal = null,
  volumeRejeteTotal = null,
  canShowVolumeData,
  isOpen,
  handleSelectAccordion,
  canInstruct,
  showPointPrelevementIdentificationHint,
  children
}) => {
  const isVolumeDefined = typeof volumePreleveTotal === 'number' && !Number.isNaN(volumePreleveTotal)
  const isRejetDefined = typeof volumeRejeteTotal === 'number' && !Number.isNaN(volumeRejeteTotal)
  const hasAnyVolume = isVolumeDefined || isRejetDefined
  const isIdentified = Boolean(pointPrelevementId)

  const instructionStyle
    = CHUNK_STATUS[instructionStatus]
    ?? CHUNK_STATUS.PENDING

  const accentColor = instructionStyle.color

  const labelColor = isIdentified
    ? fr.colors.decisions.text.default.success
    : fr.colors.decisions.text.default.error

  const mutedTextColor = fr.colors.decisions.text.mention.grey.default
  const borderColor = fr.colors.decisions.border.default.grey.default

  return (
    <Box
      sx={{
        mb: 2,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor,
        backgroundColor: '#fff',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        boxShadow: isOpen ? 2 : 0,
        '&:hover': {
          boxShadow: 2
        }
      }}
    >
      <Box
        sx={{
          borderLeft: '4px solid',
          borderLeftColor: accentColor,
          backgroundColor: '#fff'
        }}
      >
        <Box sx={{p: 2}}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2
            }}
          >
            <Box sx={{minWidth: 0, flex: 1, pr: 1}}>

              { showPointPrelevementIdentificationHint && (

                <Stack
                  direction='row'
                  spacing={1}
                  alignItems='center'
                  sx={{mb: 0.75}}
                >
                  {isIdentified ? (
                    <PlaceOutlinedIcon
                      sx={{
                        fontSize: 19,
                        color: labelColor
                      }}
                    />
                  ) : (
                    <WarningAmberRoundedIcon
                      sx={{
                        fontSize: 19,
                        color: labelColor
                      }}
                    />
                  )}

                  <Typography
                    variant='body2'
                    sx={{
                      fontWeight: 700,
                      color: labelColor,
                      lineHeight: 1.2
                    }}
                  >
                    {isIdentified
                      ? 'Point de prélèvement identifié'
                      : 'Point de prélèvement à identifier'}
                  </Typography>
                </Stack>
              )}

              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 18,
                  lineHeight: 1.15,
                  letterSpacing: 0.2,
                  mb: 0.85
                }}
              >
                {pointPrelevementName && pointPrelevementName !== suggestedPointPrelevementName ? (
                  <>
                    {pointPrelevementName} (<em>{suggestedPointPrelevementName}</em>)
                  </>
                ) : (
                  suggestedPointPrelevementName
                )}
              </Typography>

              <Stack
                useFlexGap
                direction={{xs: 'column', sm: 'row'}}
                spacing={{xs: 0.75, sm: 2}}
              >
                {isVolumeDefined && (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75
                    }}
                  >
                    <OpacityOutlinedIcon
                      sx={{
                        fontSize: 17,
                        color: mutedTextColor
                      }}
                    />
                    <Typography
                      variant='body2'
                      sx={{
                        lineHeight: 1.35,
                        color: mutedTextColor
                      }}
                    >
                      Volume prélevé :{' '}
                      <Box
                        component='span'
                        sx={{fontWeight: 700}}
                      >
                        {formatNumber(volumePreleveTotal)} m³
                      </Box>
                    </Typography>
                  </Box>
                )}

                {isRejetDefined && (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75
                    }}
                  >
                    <WaterOutlinedIcon
                      sx={{
                        fontSize: 17,
                        color: mutedTextColor
                      }}
                    />
                    <Typography
                      variant='body2'
                      sx={{
                        lineHeight: 1.35,
                        color: mutedTextColor
                      }}
                    >
                      Volume rejeté :{' '}
                      <Box
                        component='span'
                        sx={{
                          fontWeight: 700
                        }}
                      >
                        {formatNumber(volumeRejeteTotal)} m³
                      </Box>
                    </Typography>
                  </Box>
                )}

                {!hasAnyVolume && (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75
                    }}
                  >
                    <WarningAmberRoundedIcon
                      sx={{
                        fontSize: 17,
                        color: mutedTextColor
                      }}
                    />
                    <Typography
                      variant='body2'
                      sx={{
                        lineHeight: 1.35,
                        color: mutedTextColor
                      }}
                    >
                      Volume non renseigné
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            <Box
              sx={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                alignSelf: 'center',
                pr: 0.25
              }}
            >
              <ChunkInstructionBadge
                instructionStatus={instructionStatus}
                instructionComment={instructionComment}
                instructedAt={instructedAt}
                instructedBy={instructedBy}
                displayTooltip={!canInstruct}
              />
            </Box>
          </Box>
        </Box>

        { canInstruct && (
          <ChunkInstructionForm
            borderColor={borderColor}
            chunkId={chunkId}
            sourceId={sourceId}
            instructionStatus={instructionStatus}
            instructionComment={instructionComment}
            pointPrelevementId={pointPrelevementId}
            availablePoints={availablePoints}
          />
        )}

        { canShowVolumeData && (

          <Accordion
            disableGutters
            expanded={isOpen}
            elevation={0}
            sx={{
              backgroundColor: 'transparent',
              '&:before': {
                display: 'none'
              }
            }}
            onChange={handleSelectAccordion}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                p: 2,
                minHeight: 'unset',
                borderTop: '1px solid',
                borderColor,
                '& .MuiAccordionSummary-content': {
                  my: 0
                },
                '& .MuiAccordionSummary-expandIconWrapper': {
                  ml: 1.5,
                  alignSelf: 'center'
                }
              }}
            >
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 700
                }}
              >
                Détails du point, séries et graphes
              </Typography>
            </AccordionSummary>

            <AccordionDetails
              sx={{
                px: 2.25,
                pt: 0,
                pb: 2,
                backgroundColor: '#fff',
                borderTop: '1px solid',
                borderColor
              }}
            >
              {children}
            </AccordionDetails>
          </Accordion>
        ) }
      </Box>
    </Box>
  )
}

export default PrelevementsAccordion
