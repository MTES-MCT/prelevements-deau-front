import {useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {CallOut} from '@codegouvfr/react-dsfr/CallOut'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PersonIcon from '@mui/icons-material/Person'
import {
  Box,
  Typography,
  Link as MuiLink,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material'

function formatAutresNoms(autresNoms) {
  if (!autresNoms) {
    return null
  }

  const cleanedStr = autresNoms.replaceAll(/[{}"]/g, '')
  const result = [...new Set(cleanedStr.split(','))].join(', ')

  return result
}

const SectionTitle = ({title}) => (
  <Box className='my-4'>
    <Typography variant='h6'>
      {title}
    </Typography>
  </Box>
)

const SidePanel = ({point}) => {
  // État local pour gérer l’ouverture/fermeture de la modale
  const [openModal, setOpenModal] = useState(false)
  // Stocke l’exploitation sélectionnée dont on veut afficher les règles
  const [selectedExploitation, setSelectedExploitation] = useState(null)

  // Fonction utilitaire pour grouper les règles par document
  const groupRulesByDocument = regles => {
    const map = new Map()
    for (const r of regles) {
      const doc = r.document || null
      const docId = doc?.id_document || 'no-doc'
      if (!map.has(docId)) {
        map.set(docId, {
          document: doc,
          rules: []
        })
      }

      map.get(docId).rules.push(r)
    }

    return map
  }

  if (!point) {
    return (
      <CallOut
        className='mt-4'
        iconId='ri-information-line'
        title='Consulter les points de prélèvement'
      >
        Sélectionnez un point sur la carte pour voir les détails
      </CallOut>
    )
  }

  // Conversion basique "f"/"t" => bool
  const isZre = point.zre === 't'
  const isReservoir = point.reservoir_biologique === 't'

  const findBeneficiaireName = id => {
    const bene = point.beneficiaires?.find(b => b.id_beneficiaire === id)
    if (!bene) {
      return 'Bénéficiaire inconnu'
    }

    return bene.raison_sociale || bene.sigle || `${bene.nom} ${bene.prenom}`
  }

  // Ouverture de la modale pour une exploitation donnée
  const handleOpenModal = exploitation => {
    setSelectedExploitation(exploitation)
    setOpenModal(true)
  }

  // Fermeture de la modale
  const handleCloseModal = () => {
    setOpenModal(false)
    setSelectedExploitation(null)
  }

  return (
    <Box className='flex flex-col gap-4'>
      {point.autres_noms && (
        <Typography variant='caption'>
          {formatAutresNoms(point.autres_noms)}
        </Typography>
      )}

      <Box className='mt-2 p-2' sx={{
        backgroundColor: fr.colors.decisions.background.alt.grey.default
      }}
      >
        {/* 1. Informations Principales (pas d'Accordion) */}
        <SectionTitle title='Informations Principales' />

        <Typography>
          <strong>Usage :</strong> {point.usage}
        </Typography>
        <Typography>
          <strong>Type de milieu :</strong> {point.typeMilieu}
        </Typography>
        {point.cours_eau && point.cours_eau !== '' && (
          <Typography>
            <strong>Cours d’eau :</strong> {point.cours_eau}
          </Typography>
        )}
        {point.profondeur && point.profondeur !== '' && (
          <Typography>
            <strong>Profondeur :</strong> {point.profondeur} m
          </Typography>
        )}
        <Typography>
          <strong>Zone réglementée (ZRE) :</strong> {isZre ? 'Oui' : 'Non'}
        </Typography>
        <Typography>
          <strong>Réservoir biologique :</strong>{' '}
          {isReservoir ? 'Oui' : 'Non'}
        </Typography>
      </Box>

      {/* 2. Bénéficiaires (pas d'Accordion + icône Person) */}
      <Box className='p-2' sx={{
        backgroundColor: fr.colors.decisions.background.alt.grey.default
      }}
      >
        <SectionTitle title='Bénéficiaires' />

        <Box sx={{ml: 2}}>
          {point.beneficiaires && point.beneficiaires.length > 0 ? (
            <List>
              {point.beneficiaires.map(b => {
                const label
                = b.raison_sociale
                || b.sigle
                || (b.nom && `${b.nom} ${b.prenom}`)
                || 'Bénéficiaire inconnu'
                return (
                  <ListItem key={b.id_beneficiaire}>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText primary={label} />
                  </ListItem>
                )
              })}
            </List>
          ) : (
            <Typography>Aucun bénéficiaire.</Typography>
          )}
        </Box>
      </Box>

      {/* 3. Exploitations (affichées en Accordion) */}
      <Box className='p-2' sx={{
        backgroundColor: fr.colors.decisions.background.alt.grey.default
      }}
      >
        <SectionTitle title='Historique des Exploitations' />

        {(!point.exploitation || point.exploitation.length === 0) && (
          <Typography sx={{ml: 2}}>Aucune exploitation.</Typography>
        )}
        {point.exploitation
        && point.exploitation.map(ex => {
          const dateLabel = `${ex.date_debut || '???'} - ${
            ex.date_fin || 'en cours'
          }`
          const beneficiary = findBeneficiaireName(ex.id_beneficiaire)
          return (
            <Accordion key={ex.id_exploitation} sx={{mt: 1}}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box>
                  <Typography fontWeight='bold'>
                    Exploitation #{ex.id_exploitation}
                  </Typography>
                  <Typography variant='body2'>{dateLabel}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  <strong>Bénéficiaire :</strong> {beneficiary}
                </Typography>
                {ex.usage && (
                  <Typography>
                    <strong>Usage :</strong> {ex.usage}
                  </Typography>
                )}
                {/* Bouton pour ouvrir la modale "Règles & Documents" */}
                <Box sx={{mt: 2}}>
                  <Button
                    variant='contained'
                    onClick={() => handleOpenModal(ex)}
                  >
                    Voir Règles &amp; Documents
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Box>

      {/* ---------- MODALE RÈGLES & DOCUMENTS ---------- */}
      <Dialog fullWidth open={openModal} maxWidth='md' onClose={handleCloseModal}>
        <DialogTitle>Règles &amp; Documents</DialogTitle>
        <DialogContent dividers>
          {selectedExploitation ? (
            <>
              <Typography variant='body1' sx={{mb: 2}}>
                <strong>Exploitation #{selectedExploitation.id_exploitation}</strong>
                {' - '} du {selectedExploitation.date_debut || '???'} au{' '}
                {selectedExploitation.date_fin || 'en cours'}
              </Typography>

              {selectedExploitation.regles && selectedExploitation.regles.length > 0 ? (
                <>
                  {[...groupRulesByDocument(selectedExploitation.regles).values()].map(({document, rules}, idx) => {
                    const docLabel = document
                      ? document.nom_fichier
                      : 'Sans document'
                    const docReference = document?.reference
                    const docSignature = document?.date_signature

                    return (
                      <Box key={document?.id_document || idx} sx={{mb: 3}}>
                        <Typography variant='subtitle1' fontWeight='bold'>
                          {docLabel}
                        </Typography>
                        {docReference && (
                          <Typography>
                            <strong>Référence :</strong> {docReference}
                          </Typography>
                        )}
                        {docSignature && (
                          <Typography>
                            <strong>Date signature :</strong> {docSignature}
                          </Typography>
                        )}
                        {document?.urlTelechargement && (
                          <MuiLink
                            href={document.urlTelechargement}
                            target='_blank'
                            rel='noopener'
                            sx={{
                              textDecoration: 'underline', display: 'block', mt: 1, mb: 1
                            }}
                          >
                            Télécharger le document
                          </MuiLink>
                        )}
                        <Divider sx={{my: 1}} />
                        {/* Liste des règles */}
                        {rules.map(r => (
                          <Box key={r.id_regle} sx={{mb: 1}}>
                            <Typography variant='body2'>
                              <strong>Paramètre :</strong> {r.parametre} &nbsp;
                              <strong>Valeur :</strong> {r.valeur} &nbsp;
                              <strong>Unité :</strong> {r.unite} &nbsp;
                              <strong>Contrainte :</strong> {r.contrainte}
                            </Typography>
                            {r.remarque && (
                              <Typography variant='body2' sx={{fontStyle: 'italic'}}>
                                {r.remarque}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )
                  })}
                </>
              ) : (
                <Typography>Aucune règle pour cette exploitation.</Typography>
              )}
            </>
          ) : (
            <Typography>Veuillez sélectionner une exploitation.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button color='primary' onClick={handleCloseModal}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SidePanel
