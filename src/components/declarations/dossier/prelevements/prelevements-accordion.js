import {fr} from '@codegouvfr/react-dsfr'
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
import {formatUsageReference, getUsageReferenceLabel} from '@/lib/water-uses.js'
import {formatNumber} from '@/utils/number.js'

function formatUsage(value) {
  return formatUsageReference(value)
}

function isDefinedNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value)
}

function isPositiveNumber(value) {
  return isDefinedNumber(value) && value > 0
}

function getInstructionStyle(instructionStatus) {
  return CHUNK_STATUS[instructionStatus] ?? CHUNK_STATUS.PENDING
}

function getIdentificationColor(isIdentified) {
  return isIdentified
    ? fr.colors.decisions.text.default.success
    : fr.colors.decisions.text.default.error
}

function getPointTitle(pointPrelevementName, suggestedPointPrelevementName) {
  if (pointPrelevementName && pointPrelevementName !== suggestedPointPrelevementName) {
    return (
      <>
        {pointPrelevementName} (<em>{suggestedPointPrelevementName}</em>)
      </>
    )
  }

  return suggestedPointPrelevementName
}

const IdentificationHint = ({isIdentified, labelColor}) => {
  const Icon = isIdentified ? PlaceOutlinedIcon : WarningAmberRoundedIcon
  const label = isIdentified
    ? 'Point de prélèvement identifié'
    : 'Point de prélèvement à identifier'

  return (
    <Stack
      direction='row'
      spacing={1}
      alignItems='center'
      sx={{mb: 0.75}}
    >
      <Icon
        sx={{
          fontSize: 19,
          color: labelColor
        }}
      />

      <Typography
        variant='body2'
        sx={{
          fontWeight: 700,
          color: labelColor,
          lineHeight: 1.2
        }}
      >
        {label}
      </Typography>
    </Stack>
  )
}

const SummaryMetric = ({Icon, label, mutedTextColor, value}) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.75
    }}
  >
    <Icon
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
      {label} : <Box component='span' sx={{fontWeight: 700}}>{value}</Box>
    </Typography>
  </Box>
)

const EmptyVolumeMetric = ({mutedTextColor}) => (
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
)

const PrelevementsSummary = ({
  indexUnit,
  indexValue,
  mutedTextColor,
  usage,
  volumePreleveTotal,
  volumeRejeteTotal
}) => {
  const metrics = [
    isPositiveNumber(volumePreleveTotal) && {
      key: 'volume-preleve',
      Icon: OpacityOutlinedIcon,
      label: 'Volume prélevé',
      value: `${formatNumber(volumePreleveTotal)} m³`
    },
    isDefinedNumber(indexValue) && {
      key: 'index',
      Icon: OpacityOutlinedIcon,
      label: 'Index déclaré',
      value: `${formatNumber(indexValue)} ${indexUnit}`
    },
    usage && {
      key: 'usage',
      Icon: WaterOutlinedIcon,
      label: getUsageReferenceLabel(usage),
      value: formatUsage(usage)
    },
    isPositiveNumber(volumeRejeteTotal) && {
      key: 'volume-rejete',
      Icon: WaterOutlinedIcon,
      label: 'Volume rejeté',
      value: `${formatNumber(volumeRejeteTotal)} m³`
    }
  ].filter(Boolean)

  if (metrics.length === 0) {
    return <EmptyVolumeMetric mutedTextColor={mutedTextColor} />
  }

  return metrics.map(({Icon, key, label, value}) => (
    <SummaryMetric
      key={key}
      Icon={Icon}
      label={label}
      mutedTextColor={mutedTextColor}
      value={value}
    />
  ))
}

const PrelevementsHeader = ({
  canInstruct,
  indexUnit,
  indexValue,
  instructedAt,
  instructedBy,
  instructionComment,
  instructionStatus,
  isIdentified,
  labelColor,
  mutedTextColor,
  pointPrelevementName,
  showPointPrelevementIdentificationHint,
  suggestedPointPrelevementName,
  usage,
  volumePreleveTotal,
  volumeRejeteTotal
}) => (
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
        {showPointPrelevementIdentificationHint && (
          <IdentificationHint
            isIdentified={isIdentified}
            labelColor={labelColor}
          />
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
          {getPointTitle(pointPrelevementName, suggestedPointPrelevementName)}
        </Typography>

        <Stack
          useFlexGap
          direction={{xs: 'column', sm: 'row'}}
          spacing={{xs: 0.75, sm: 2}}
        >
          <PrelevementsSummary
            indexUnit={indexUnit}
            indexValue={indexValue}
            mutedTextColor={mutedTextColor}
            usage={usage}
            volumePreleveTotal={volumePreleveTotal}
            volumeRejeteTotal={volumeRejeteTotal}
          />
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
)

const InstructionFormPanel = ({
  availablePoints,
  borderColor,
  canInstruct,
  chunkId,
  instructionComment,
  instructionStatus,
  pointPrelevementId,
  pointAssociationOrigin,
  sourceId
}) => {
  if (!canInstruct) {
    return null
  }

  return (
    <ChunkInstructionForm
      borderColor={borderColor}
      chunkId={chunkId}
      sourceId={sourceId}
      instructionStatus={instructionStatus}
      instructionComment={instructionComment}
      pointPrelevementId={pointPrelevementId}
      pointAssociationOrigin={pointAssociationOrigin}
      availablePoints={availablePoints}
    />
  )
}

const VolumeDataAccordion = ({
  borderColor,
  canShowVolumeData,
  children,
  handleSelectAccordion,
  isOpen
}) => {
  if (!canShowVolumeData) {
    return null
  }

  return (
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
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor
        }}
      >
        {children}
      </AccordionDetails>
    </Accordion>
  )
}

const PrelevementsAccordion = ({
  pointPrelevementId,
  pointAssociationOrigin,
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
  indexValue = null,
  indexUnit = 'm³',
  usage = null,
  canShowVolumeData,
  isOpen,
  handleSelectAccordion,
  canInstruct,
  showPointPrelevementIdentificationHint,
  children
}) => {
  const isIdentified = Boolean(pointPrelevementId)
  const instructionStyle = getInstructionStyle(instructionStatus)
  const accentColor = instructionStyle.color
  const labelColor = getIdentificationColor(isIdentified)
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
        backgroundColor: 'background.paper',
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
          backgroundColor: 'background.paper'
        }}
      >
        <PrelevementsHeader
          canInstruct={canInstruct}
          indexUnit={indexUnit}
          indexValue={indexValue}
          instructedAt={instructedAt}
          instructedBy={instructedBy}
          instructionComment={instructionComment}
          instructionStatus={instructionStatus}
          isIdentified={isIdentified}
          labelColor={labelColor}
          mutedTextColor={mutedTextColor}
          pointPrelevementName={pointPrelevementName}
          showPointPrelevementIdentificationHint={showPointPrelevementIdentificationHint}
          suggestedPointPrelevementName={suggestedPointPrelevementName}
          usage={usage}
          volumePreleveTotal={volumePreleveTotal}
          volumeRejeteTotal={volumeRejeteTotal}
        />

        <InstructionFormPanel
          availablePoints={availablePoints}
          borderColor={borderColor}
          canInstruct={canInstruct}
          chunkId={chunkId}
          instructionComment={instructionComment}
          instructionStatus={instructionStatus}
          pointPrelevementId={pointPrelevementId}
          pointAssociationOrigin={pointAssociationOrigin}
          sourceId={sourceId}
        />

        <VolumeDataAccordion
          borderColor={borderColor}
          canShowVolumeData={canShowVolumeData}
          handleSelectAccordion={handleSelectAccordion}
          isOpen={isOpen}
        >
          {children}
        </VolumeDataAccordion>
      </Box>
    </Box>
  )
}

export default PrelevementsAccordion
