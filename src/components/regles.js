'use client'

import {fr} from '@codegouvfr/react-dsfr'
import {Button} from '@codegouvfr/react-dsfr/Button'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'
import {
  Box, Typography, Accordion, AccordionSummary,
  AccordionDetails
} from '@mui/material'

import {downloadCsv} from '@/lib/export-csv.js'

const API_URL = process.env.NEXT_PUBLIC_STORAGE_URL

const InfoRow = ({label, value}) => (
  <Box sx={{display: 'flex', justifyContent: 'space-between'}}>
    <Typography fontWeight='light' className='fr-text--sm'>{label}</Typography>
    <Typography fontWeight='medium' className='fr-text--sm'>{value || '-'}</Typography>
  </Box>
)

const RegleHeader = ({parametre, valeur, unite, contrainte}) => (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: 2,
    marginRight: 2
  }}
  >
    <div className='flex items-end'>
      <span style={{color: fr.colors.decisions.text.label.blueFrance.default}}>
        <WaterDropOutlinedIcon />
      </span>
      <Typography fontWeight='bold'>{parametre}</Typography>
    </div>
    <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
      <InfoRow label='Valeur' value={`${valeur} ${unite}`} />
      <InfoRow label='Contrainte' value={contrainte} />
    </Box>
  </Box>
)

const Regles = ({regles, documents}) => (
  <Box>
    <Box sx={{display: 'flex', justifyContent: 'end'}}>
      <Button
        priority='secondary'
        iconId='fr-icon-download-line'
        size='small'
        className='mb-3'
        onClick={() => downloadCsv(regles, 'regles.csv')}
      >
        Télécharger au format csv
      </Button>
    </Box>

    {regles.map(regle => {
      const regleDocument = documents.find(d => d.id_document === regle.id_document)

      return (
        <Accordion key={regle.id_regle}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <RegleHeader
              parametre={regle.parametre}
              valeur={regle.valeur}
              unite={regle.unite}
              contrainte={regle.contrainte}
            />
          </AccordionSummary>
          <AccordionDetails>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                borderTop: `solid 1px ${fr.colors.options.grey._950_100.default}`,
                paddingTop: 1
              }}
            >
              <InfoRow label='Début de validité' value={regle.debut_validite} />
              <InfoRow label='Fin de validité' value={regle.fin_validite} />
              <InfoRow label='Début période' value={regle.debut_periode} />
              <InfoRow label='Fin période' value={regle.fin_periode} />
              <InfoRow
                label='Document'
                value={
                  regleDocument ? (
                    <a
                      href={`${API_URL}/document/${regleDocument.nom_fichier}`}
                      target='_blank'
                      rel='noreferrer'
                    >
                      {regleDocument.nature}
                    </a>
                  ) : '-'
                }
              />
              <InfoRow label='Commentaire' value={regle.remarque} />
            </Box>
          </AccordionDetails>
        </Accordion>
      )
    })}
  </Box>
)

export default Regles
