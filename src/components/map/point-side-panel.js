import {useEffect, useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {CallOut} from '@codegouvfr/react-dsfr/CallOut'
import LaunchIcon from '@mui/icons-material/Launch'
import PersonIcon from '@mui/icons-material/Person'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AlertTitle,
  Alert
} from '@mui/material'
import Link from 'next/link.js'

import ExploitationAccordion from '../exploitation-accordion.js'

import {getExploitationsByPointId} from '@/app/api/points-prelevement.js'

const SectionTitle = ({title}) => (
  <Box className='my-4'>
    <Typography variant='h6'>
      {title}
    </Typography>
  </Box>
)

const PointSidePanel = ({point}) => {
  const [exploitations, setExploitations] = useState([])

  useEffect(() => {
    async function fetchExploitations() {
      if (point) {
        const exploitations = await getExploitationsByPointId(point.id_point)

        setExploitations(exploitations)
      }
    }

    fetchExploitations()
  }, [point])

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

  return (
    <Box className='flex flex-col gap-4 px-4 pb-4'>
      {point.autresNoms && (
        <Typography variant='caption'>
          {point.autresNoms}
        </Typography>
      )}

      {point.remarque && (
        <Alert severity='info'>
          <AlertTitle>Remarque</AlertTitle>
          {point.remarque}
        </Alert>
      )}

      <Box className='mt-2 p-2' sx={{
        backgroundColor: fr.colors.decisions.background.alt.grey.default
      }}
      >
        {/* 1. Informations Principales (pas d'Accordion) */}
        <SectionTitle title='Informations Principales' />

        <Typography>
          <strong>Usages :</strong> {point.usages.join(', ')}
        </Typography>
        <Typography>
          <strong>Type de milieu :</strong> {point.type_milieu}
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
          <strong>Zone réglementée (ZRE) :</strong> {point.zre ? 'Oui' : 'Non'}
        </Typography>
        <Typography>
          <strong>Réservoir biologique :</strong>{' '}
          {point.reservoir_biologique ? 'Oui' : 'Non'}
        </Typography>
        <Typography sx={{pt: 2}} variant='h6'>
          <Link href={`/prelevements/${point.id_point}/identification`}>
            <b>Plus d’informations</b>
          </Link>
          <LaunchIcon sx={{ml: 1}} />
        </Typography>
      </Box>

      {/* 2. Préleveurs (pas d'Accordion + icône Person) */}
      <Box className='p-2' sx={{
        backgroundColor: fr.colors.decisions.background.alt.grey.default
      }}
      >
        <SectionTitle title='Préleveurs' />

        <Box sx={{ml: 2}}>
          {point.preleveurs && point.preleveurs.length > 0 ? (
            <List>
              {point.preleveurs.map(b => {
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

        {exploitations.length === 0 && (
          <Typography sx={{ml: 2}}>Aucune exploitation.</Typography>
        )}
        {exploitations.length > 0 && exploitations.map(exploitation => (
          <ExploitationAccordion
            key={exploitation.id_exploitation}
            exploitation={exploitation}
            preleveurs={point.preleveurs}
          />
        ))}
      </Box>
    </Box>
  )
}

export default PointSidePanel
