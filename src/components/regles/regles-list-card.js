'use client'

import {fr} from '@codegouvfr/react-dsfr'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Tooltip} from '@codegouvfr/react-dsfr/Tooltip'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import Link from 'next/link'

import SectionCard from '@/components/ui/SectionCard/index.js'
import {downloadCsv} from '@/lib/export-csv.js'
import {formatDateRange, formatFullDateFr} from '@/lib/format-date.js'
import {getParametreInfo, getRegleContrainte} from '@/lib/regles.js'
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

const RegleHeader = ({parametre, debutValidite, finValidite, debutPeriode, finPeriode, unite, valeur, contrainte}) => {
  const parametreInfo = getParametreInfo(parametre)
  const label = parametreInfo?.label || parametre
  const icon = parametreInfo?.icon

  return (
    <Box className='flex flex-col w-full gap-4'>
      <Box className='flex items-end align-middle gap-1'>
        <span style={{color: fr.colors.decisions.text.label.blueFrance.default}}>
          {icon}
        </span>
        <Typography fontWeight='bold'>{label}</Typography>
        <Typography>{`${getRegleContrainte(contrainte) || contrainte} ${formatNumber(valeur)} ${unite}`}</Typography>
      </Box>

      <Box className='mr-3'>
        <InfoRow
          description="Dates de début et le cas échéant de fin d'application de la règle"
          label='Validité'
          value={formatDateRange(debutValidite, finValidite)}
        />

        <InfoRow
          description="Période de l'année durant laquelle s'applique la règle (utile dans les cas où un même paramètre est associé à des seuils évoluant selon la saison)"
          label='Période'
          value={formatDateRange(debutPeriode, finPeriode)}
        />
      </Box>
    </Box>
  )
}

const RegleItem = ({regle, preleveurId}) => (
  <Accordion
    disableGutters
    className='fr-card'
    sx={{boxShadow: 'none'}}
  >
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <RegleHeader
        contrainte={regle.contrainte}
        debutPeriode={regle.debut_periode}
        debutValidite={regle.debut_validite}
        finPeriode={regle.fin_periode}
        finValidite={regle.fin_validite}
        parametre={regle.parametre}
        unite={regle.unite}
        valeur={regle.valeur}
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
                {`${regle.document.nature} ${regle.document.reference || ''} du ${formatFullDateFr(regle.document.date_signature)}`}
              </a>
            ) : '-'
          }
        />
        <InfoRow label='Exploitations' value={regle.exploitations?.length || 0} />
        <InfoRow label='Commentaire' value={regle.remarque} />
        <Box className='flex justify-end mt-2'>
          <Link href={`/preleveurs/${preleveurId}/regles/${regle._id}`}>
            <Button
              iconId='fr-icon-edit-line'
              priority='tertiary'
              size='small'
            >
              Modifier
            </Button>
          </Link>
        </Box>
      </Box>
    </AccordionDetails>
  </Accordion>
)

const ReglesListCard = ({regles, preleveurId, hasExploitations}) => (
  <SectionCard
    buttonProps={hasExploitations ? {
      children: 'Ajouter une règle',
      iconId: 'fr-icon-add-line',
      priority: 'secondary',
      linkProps: {
        href: `/preleveurs/${preleveurId}/regles/new`
      }
    } : undefined}
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

    {regles.length > 0 ? (
      <>
        <Box className='flex justify-end mb-3'>
          <Button
            iconId='fr-icon-download-line'
            priority='secondary'
            size='small'
            onClick={() => downloadCsv(regles, 'regles.csv')}
          >
            Télécharger au format csv
          </Button>
        </Box>

        <Box className='flex flex-col gap-2'>
          {regles.map(regle => (
            <RegleItem
              key={regle._id}
              preleveurId={preleveurId}
              regle={regle}
            />
          ))}
        </Box>
      </>
    ) : (
      <Typography className='fr-text--sm italic'>
        Aucune règle définie pour ce préleveur.
      </Typography>
    )}
  </SectionCard>
)

export default ReglesListCard
