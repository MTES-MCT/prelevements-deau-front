import {useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {CallOut} from '@codegouvfr/react-dsfr/CallOut'
import PersonIcon from '@mui/icons-material/Person'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material'

import ExploitationAccordion from '../exploitation-accordion.js'
import ExploitationDialog from '../exploitation-dialog.js'

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
        {point.exploitation && point.exploitation.map(exploitation => (
          <ExploitationAccordion
            key={exploitation.id_exploitation}
            exploitation={exploitation}
            beneficiaires={point.beneficiaires}
            handleOpenModal={handleOpenModal}
          />
        ))}
      </Box>

      {/* ---------- MODALE RÈGLES & DOCUMENTS ---------- */}
      <ExploitationDialog
        openModal={openModal}
        handleClose={handleCloseModal}
        exploitation={selectedExploitation}
      />
    </Box>
  )
}

export default SidePanel
