import {fr} from '@codegouvfr/react-dsfr'
import {Tooltip} from '@codegouvfr/react-dsfr/Tooltip'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box, Typography, Accordion, AccordionSummary,
  AccordionDetails
} from '@mui/material'

import {formatDateRange, formatFullDateFr} from '@/lib/format-date.js'
import {getParametreInfo} from '@/lib/regles.js'

const API_URL = process.env.NEXT_PUBLIC_STORAGE_URL

const InfoRow = ({label, value, description}) => (
  <Box className='flex justify-between'>
    <Typography fontWeight='medium' className='fr-text--sm'>{label}</Typography>
    <Box className='flex gap-1'>
      <Typography fontWeight='light' className='fr-text--sm'>{value || '-'}</Typography>
      {description && <Tooltip title={description} />}
    </Box>
  </Box>
)

const RegleHeader = ({parametre, debutValidite, finValidite, debutPeriode, finPeriode}) => {
  const {label, icon} = getParametreInfo(parametre)

  return (
    <Box className='flex flex-col w-full gap-4'>
      <Box className='flex items-end align-middle gap-1'>
        <span style={{color: fr.colors.decisions.text.label.blueFrance.default}}>
          {icon}
        </span>
        <Typography fontWeight='bold'>{label}</Typography>
      </Box>

      <Box className='mr-3'>
        <InfoRow
          label='Validité'
          value={formatDateRange(debutValidite, finValidite)}
          description='Dates de début et le cas échéant de fin d’application de la règle'
        />

        <InfoRow
          label='Période'
          value={formatDateRange(debutPeriode, finPeriode)}
          description='Période de l’année durant laquelle s’applique la règle (utile dans les cas où un même paramètre est associé à des seuils évoluant selon la saison)'
        />
      </Box>
    </Box>
  )
}

const Regle = ({regle, documents}) => {
  const regleDocument = documents.find(d => d.id_document === regle.id_document)

  return (
    <Accordion className='fr-card' sx={{boxShadow: 'none'}}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <RegleHeader
          parametre={regle.parametre}
          debutValidite={regle.debut_validite}
          debutPeriode={regle.debut_periode}
          finValidite={regle.fin_validite}
          finPeriode={regle.fin_periode}
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
              regleDocument ? (
                <a
                  href={`${API_URL}/document/${regleDocument.nom_fichier}`}
                  target='_blank'
                  rel='noreferrer'
                >
                  {`${regleDocument.nature} ${regleDocument.reference} du ${formatFullDateFr(regleDocument.date_signature)}`}
                </a>
              ) : '-'
            }
          />
          <InfoRow label='Commentaire' value={regle.remarque} />
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}

export default Regle
