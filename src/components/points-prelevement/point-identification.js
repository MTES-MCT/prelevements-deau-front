import {Button} from '@codegouvfr/react-dsfr/Button'
import Article from '@mui/icons-material/Article'
import Launch from '@mui/icons-material/Launch'
import {Box, Chip, Typography} from '@mui/material'

import PointUsageNameEditor from '@/components/points-prelevement/point-usage-name-editor.js'
import formatDate from '@/lib/format-date.js'
import {
  POINT_KINDS,
  pointKindLabels,
  pointOriginLabels,
  pointWithdrawalTypeLabels
} from '@/lib/point-characteristics.js'
import {
  getPointFlowType,
  getPointFlowTypeColors,
  getPointFlowTypeLabel
} from '@/lib/point-flow-types.js'
import {getTypeMilieuColor} from '@/lib/points-prelevement.js'
import {
  getPointPrelevementLabel,
  getPointPrelevementTechnicalReference
} from '@/utils/point-prelevement.js'

const waterBodyTypeLabels = {
  SUPERFICIELLE: 'Eau superficielle',
  SOUTERRAIN: 'Eau souterraine',
  TRANSITION: 'Eau de transition'
}

const formatLabel = (labels, value) => labels[value] ?? value

const formatNullableBoolean = value => {
  if (value === true) {
    return 'Oui'
  }

  if (value === false) {
    return 'Non'
  }

  return 'Non renseigné'
}

const LinkWithIcon = ({label, href}) => (
  <Box className='flex flex-wrap gap-1'>
    <Article />
    <b>{label} :</b>
    <span>
      <a className='mr-1' href={href}>{href}</a>
      <Launch />
    </span>
  </Box>
)

const LabelValue = ({label, value, children}) => {
  if (!value && !children) {
    return null
  }

  return (
    <Box className='flex flex-wrap gap-1'>
      <b>{label} :</b>
      {value ? <span>{value}</span> : children}
    </Box>
  )
}

const formatNameEntries = names => {
  if (!Array.isArray(names)) {
    return null
  }

  const values = names
    .map(name => typeof name === 'string' ? name : name?.value)
    .filter(Boolean)

  return values.length > 0 ? values.join(', ') : null
}

const IdentifierList = ({identifiers}) => {
  if (!identifiers || typeof identifiers !== 'object' || Array.isArray(identifiers)) {
    return null
  }

  const entries = Object.entries(identifiers).filter(([, value]) => value)

  if (entries.length === 0) {
    return null
  }

  return (
    <Box className='flex flex-col gap-1'>
      <b>Identifiants :</b>
      <ul className='m-0'>
        {entries.map(([key, value]) => (
          <li key={key} className='ml-5'>
            <b>{key} :</b> <span>{value}</span>
          </li>
        ))}
      </ul>
    </Box>
  )
}

const PointIdentification = ({
  pointPrelevement,
  lienBss,
  lienBnpe,
  preferUsageName = false
}) => {
  const {id: idPoint} = pointPrelevement
  const pointLabel = getPointPrelevementLabel({pointPrelevement, preferUsageName})
  const technicalReference = getPointPrelevementTechnicalReference(pointPrelevement, {preferUsageName})
  const typeMilieuColor = getTypeMilieuColor(pointPrelevement.waterBodyType)
  const namesLabel = formatNameEntries(pointPrelevement.names)
  const canEditUsageName = preferUsageName && pointPrelevement.right?.canEditUsageName
  const flowType = getPointFlowType(pointPrelevement)
  const flowTypeColors = getPointFlowTypeColors(flowType)

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex justify-between md:items-center sm:items-start gap-4 pb-2'>
        <div className='min-w-0'>
          <Typography variant='h3'>
            <span className='flex flex-wrap items-center gap-4'>
              {pointLabel} {pointPrelevement.exploitationsStatus && (
                <small className='fr-badge fr-badge--success fr-badge--no-icon'>{pointPrelevement.exploitationsStatus}</small>
              )}
            </span>
          </Typography>
          {technicalReference && (
            <p className='fr-text--sm fr-mb-0 text-gray-600'>
              Référence : {technicalReference}
            </p>
          )}
          {canEditUsageName && (
            <PointUsageNameEditor
              pointId={idPoint}
              usageName={pointPrelevement.usageName}
            />
          )}
        </div>
        {pointPrelevement.right?.canEdit && (
          <Button
            priority='secondary'
            iconId='fr-icon-edit-line'
            linkProps={{
              href: `/points-prelevement/${idPoint}/edit`
            }}
          >
            Modifier le point de prélèvement
          </Button>
        )}
      </div>

      <Box className='flex flex-wrap items-center gap-2'>
        <Chip
          size='small'
          label={`Type de point : ${getPointFlowTypeLabel(flowType)}`}
          sx={{
            backgroundColor: flowTypeColors.backgroundColor,
            color: flowTypeColors.textColor
          }}
        />
        <Chip
          size='small'
          label={`Nature du point : ${formatLabel(
            pointKindLabels,
            pointPrelevement.pointKind ?? POINT_KINDS.PHYSIQUE
          )}`}
        />
        {pointPrelevement.waterBodyType && (
          <Chip
            size='small'
            label={`Type de milieu : ${formatLabel(waterBodyTypeLabels, pointPrelevement.waterBodyType)}`}
            sx={{
              backgroundColor: typeMilieuColor.background,
              color: typeMilieuColor.textColor
            }}
          />
        )}

        {pointPrelevement.nature && (
          <Chip
            size='small'
            label={`Origine prélèvement / rejet : ${formatLabel(pointOriginLabels, pointPrelevement.nature)}`}
          />
        )}

        {pointPrelevement.withdrawalType && (
          <Chip
            size='small'
            label={`Type de prélèvement / rejet : ${formatLabel(pointWithdrawalTypeLabels, pointPrelevement.withdrawalType)}`}
          />
        )}
      </Box>

      <div className='flex flex-col gap-1'>
        <LabelValue label='Autres noms' value={pointPrelevement.otherNames} />
        <LabelValue label='Noms structurés' value={namesLabel} />
        <LabelValue
          label='Date de mise en service'
          value={formatDate(pointPrelevement.commissioningDate)}
        />
        <LabelValue
          label='Identifiant interne Agence de l’eau'
          value={pointPrelevement.waterAgencyInternalIdentifier}
        />
        <LabelValue
          label='Point référent de l’ouvrage'
          value={formatNullableBoolean(pointPrelevement.isReferencePoint)}
        />
        {pointPrelevement.nature === 'PLAN_EAU' && (
          <>
            <LabelValue
              label='Plan d’eau connecté au cours d’eau'
              value={formatNullableBoolean(pointPrelevement.isWaterBodyConnectedToStream)}
            />
            <LabelValue
              label='Plan d’eau connecté à la nappe'
              value={formatNullableBoolean(pointPrelevement.isWaterBodyConnectedToGroundwater)}
            />
          </>
        )}
        <IdentifierList identifiers={pointPrelevement.identifiers} />
      </div>

      <div className='flex flex-col gap-1'>
        {lienBss && (
          <LinkWithIcon
            href={lienBss}
            label='Fiche BSS InfoTerre'
          />
        )}
        {lienBnpe && (
          <LinkWithIcon
            href={lienBnpe}
            label='Fiche ouvrage BNPE'
          />
        )}
      </div>
    </div>
  )
}

export default PointIdentification
