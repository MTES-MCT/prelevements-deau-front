'use client'

import {useEffect, useMemo, useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Badge} from '@codegouvfr/react-dsfr/Badge'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Tooltip} from '@codegouvfr/react-dsfr/Tooltip'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'
import Link from 'next/link'

import SectionCard from '@/components/ui/SectionCard/index.js'
import {downloadCsv} from '@/lib/export-csv.js'
import {formatDateRange, formatFullDateFr} from '@/lib/format-date.js'
import {
  getParameterInfo,
  getConstraintLabel,
  getRegleStatus,
  sortReglesByStatus
} from '@/lib/regles.js'
import {deleteRegleAction} from '@/server/actions/index.js'
import {formatNumber} from '@/utils/number.js'

const InfoRow = ({label, value, description}) => (
  <Box className='flex justify-between sm:flex-row flex-col gap-1'>
    <Typography fontWeight='medium' className='fr-text--sm'>{label}</Typography>
    <Box className='flex gap-1'>
      <Typography fontWeight='light' className='fr-text--sm'>{value || '-'}</Typography>
      {description && <Tooltip title={description} />}
    </Box>
  </Box>
)

const statusConfig = {
  active: {
    label: null,
    severity: 'success',
    style: {}
  },
  'hors-saison': {
    label: 'Hors saison',
    severity: 'info',
    style: {}
  },
  'a-venir': {
    label: 'À venir',
    severity: 'new',
    style: {}
  },
  obsolete: {
    label: 'Obsolète',
    severity: null,
    style: {
      opacity: 0.6,
      backgroundColor: fr.colors.decisions.background.disabled.grey.default
    }
  }
}

const RegleStatusBadge = ({status}) => {
  const config = statusConfig[status]

  if (!config?.label) {
    return null
  }

  if (status === 'obsolete') {
    return (
      <span
        className='fr-badge fr-badge--sm'
        style={{
          backgroundColor: fr.colors.decisions.background.contrast.grey.default,
          color: fr.colors.decisions.text.default.grey.default
        }}
      >
        {config.label}
      </span>
    )
  }

  return (
    <Badge small severity={config.severity}>
      {config.label}
    </Badge>
  )
}

const RegleHeader = ({
  parameter,
  frequency,
  validityStartDate,
  validityEndDate,
  annualPeriodStartDate,
  annualPeriodEndDate,
  unit,
  value,
  constraint,
  status
}) => {
  const parameterInfo = getParameterInfo(parameter, frequency)
  const label = parameterInfo?.label || parameter
  const icon = parameterInfo?.icon

  return (
    <Box className='flex flex-col w-full gap-4'>
      <Box className='flex items-center align-middle gap-2 flex-wrap'>
        <Box className='flex items-end gap-1'>
          <span style={{color: fr.colors.decisions.text.label.blueFrance.default}}>
            {icon}
          </span>
          <Typography fontWeight='bold'>{label}</Typography>
          <Typography>{`${getConstraintLabel(constraint) || constraint} ${formatNumber(value)} ${unit || ''}`}</Typography>
        </Box>
        <RegleStatusBadge status={status} />
      </Box>

      <Box className='mr-3'>
        <InfoRow
          description="Dates de début et le cas échéant de fin d'application de la règle"
          label='Validité'
          value={formatDateRange(validityStartDate, validityEndDate)}
        />

        <InfoRow
          description="Période de l'année durant laquelle s'applique la règle"
          label='Période'
          value={formatDateRange(annualPeriodStartDate, annualPeriodEndDate)}
        />
      </Box>
    </Box>
  )
}

const RegleItem = ({canDelete, canUpdate, regle, preleveurId, status, onDelete}) => {
  const itemStyle = statusConfig[status]?.style || {}

  return (
    <Accordion
      disableGutters
      className='fr-card'
      sx={{boxShadow: 'none', ...itemStyle}}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <RegleHeader
          annualPeriodEndDate={regle.annualPeriodEndDate}
          annualPeriodStartDate={regle.annualPeriodStartDate}
          constraint={regle.constraint}
          frequency={regle.frequency}
          parameter={regle.parameter}
          status={status}
          unit={regle.unit}
          validityEndDate={regle.validityEndDate}
          validityStartDate={regle.validityStartDate}
          value={regle.value}
        />
      </AccordionSummary>
      <AccordionDetails>
        <Box
          className='flex flex-col gap-1 border-t pt-1'
          style={{borderColor: fr.colors.decisions.background.contrast.grey.default}}
        >
          <InfoRow
            label='Document'
            value={
              regle.document ? (
                <a
                  href={regle.document.downloadUrl}
                  rel='noreferrer'
                  target='_blank'
                >
                  {`${regle.document.nature} ${regle.document.reference || ''} du ${formatFullDateFr(regle.document.signatureDate)}`}
                </a>
              ) : '-'
            }
          />
          <InfoRow label='Exploitations' value={regle.exploitations?.length || 0} />
          <InfoRow label='Commentaire' value={regle.comment} />
          {(canUpdate || canDelete) && (
            <Box className='flex flex-wrap justify-end gap-2 mt-2'>
              {canUpdate && <Link href={`/declarants/${preleveurId}/regles/${regle.id}`}>
                <Button
                  iconId='fr-icon-edit-line'
                  priority='tertiary'
                  size='small'
                >
                  Modifier
                </Button>
              </Link>}
              {canDelete && (
                <Button
                  iconId='fr-icon-delete-line'
                  priority='tertiary no outline'
                  size='small'
                  style={{color: fr.colors.decisions.text.active.redMarianne.default}}
                  title='Supprimer cette règle'
                  onClick={() => onDelete(regle)}
                >
                  Supprimer
                </Button>
              )}
            </Box>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}

const ReglesListCard = ({canCreate = false, canDelete = false, canUpdate = false, regles = [], preleveurId, hasExploitations}) => {
  const [visibleRegles, setVisibleRegles] = useState(regles)
  const [regleToDelete, setRegleToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const sortedRegles = useMemo(() => sortReglesByStatus(visibleRegles), [visibleRegles])

  useEffect(() => {
    setVisibleRegles(regles)
  }, [regles])

  const handleDelete = async () => {
    if (!regleToDelete) {
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const result = await deleteRegleAction(regleToDelete.id, preleveurId)
      if (!result.success) {
        setError(result.error || 'La suppression de la règle a échoué.')
        return
      }

      setVisibleRegles(current => current.filter(regle => regle.id !== regleToDelete.id))
      setRegleToDelete(null)
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <SectionCard
      buttonProps={canCreate && hasExploitations ? {
        children: 'Ajouter une règle',
        iconId: 'fr-icon-add-line',
        priority: 'secondary',
        linkProps: {
          href: `/declarants/${preleveurId}/regles/new`
        }
      } : undefined}
      editorOnly={false}
      icon='fr-icon-scales-3-line'
      title='Règles'
    >
      {!hasExploitations && (
        <Box className='mb-3 p-3 rounded' style={{backgroundColor: fr.colors.decisions.background.alt.blueEcume.default}}>
          <Typography className='fr-text--sm'>
            <span className='fr-icon-info-line mr-2' aria-hidden='true' />{' '}
            Vous devez créer une exploitation avant de pouvoir ajouter des règles.
          </Typography>
        </Box>
      )}

      {sortedRegles.length > 0 ? (
        <>
          <Box className='flex justify-end mb-3'>
            <Button
              iconId='fr-icon-download-line'
              priority='secondary'
              size='small'
              onClick={() => downloadCsv(visibleRegles, 'regles.csv')}
            >
              Télécharger au format csv
            </Button>
          </Box>

          <Box className='flex flex-col gap-2'>
            {sortedRegles.map(regle => (
              <RegleItem
                key={regle.id}
                canDelete={canDelete}
                canUpdate={canUpdate}
                preleveurId={preleveurId}
                regle={regle}
                status={getRegleStatus(regle)}
                onDelete={setRegleToDelete}
              />
            ))}
          </Box>
        </>
      ) : (
        <Typography className='fr-text--sm italic'>
          Aucune règle définie pour ce déclarant.
        </Typography>
      )}

      {error && (
        <Alert
          closable
          small
          className='mt-3'
          description={error}
          severity='error'
          title='Suppression impossible'
          onClose={() => setError(null)}
        />
      )}

      <Dialog
        maxWidth='sm'
        open={Boolean(regleToDelete)}
        onClose={() => setRegleToDelete(null)}
      >
        <DialogTitle>Supprimer cette règle</DialogTitle>
        <DialogContent>
          Êtes-vous sûr de vouloir supprimer cette règle ? Cette action est irréversible.
        </DialogContent>
        <DialogActions className='m-3'>
          <Button priority='secondary' onClick={() => setRegleToDelete(null)}>
            Annuler
          </Button>
          <Button
            disabled={deleting}
            style={{backgroundColor: '#ce0500'}}
            onClick={handleDelete}
          >
            {deleting ? 'Suppression…' : 'Supprimer cette règle'}
          </Button>
        </DialogActions>
      </Dialog>
    </SectionCard>
  )
}

export default ReglesListCard
