'use client'

import {useState} from 'react'

import {
  Box,
  Button,
  Typography
} from '@mui/material'
import {useTheme} from '@mui/material/styles'

import PointDetails from '@/components/map/point-details.js'

const typesMilieu = {
  1: 'Eau continentale',
  2: 'Eau souterraine',
  3: 'Eaux de transition'
}

const usages = {
  1: 'Eau potable',
  2: 'Agriculture',
  3: 'Autre',
  4: 'Camion citerne',
  5: 'Eau embouteillée',
  6: 'Hydroélectricité',
  7: 'Industrie',
  8: 'Non renseigné',
  9: 'Thermalisme'
}

const SidePanel = ({selectedPoint}) => {
  const theme = useTheme()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <Box
      sx={{
        width: '40%',
        p: 2,
        overflow: 'auto',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary
      }}
    >
      {selectedPoint ? (
        <>
          <PointDetails
            point={selectedPoint}
            isDialogOpen={isDialogOpen}
            setIsDialogOpen={setIsDialogOpen}
          />
          <Typography variant='h5'>Informations sur les points de prélèvement :</Typography>
          <Box
            component='div'
            sx={{
              p: 2
            }}
          >
            <div><b>Nom :</b> {selectedPoint.nom || <i>Non renseigné</i>}</div>
            <div><b>Autres noms :</b> {selectedPoint.autres_noms || <i>Non renseigné</i>}</div>
            <div><b>Détail localisation :</b> {selectedPoint.detail_localisation || <i>Non renseigné</i>}</div>
            <div><b>Cours d’eau :</b> {selectedPoint.cours_eau || <i>Non renseigné</i>}</div>
            <div><b>Type de milieu :</b> {typesMilieu[selectedPoint.type_milieu] || <i>Non renseigné</i>}</div>
            <div><b>Usage : </b> {usages[selectedPoint.usage] || <i>Non renseigné</i>}</div>
            <div><b>Précision :</b> {selectedPoint.precision || <i>Non renseigné</i>}</div>
            <div><b>Profondeur :</b> {selectedPoint.profondeur || <i>Non renseigné</i>}</div>
            <div><b>Réservoir biologique :</b> {selectedPoint.reservoir_biologique || <i>Non renseigné</i>}</div>
            <div><b>Nombre de préleveurs :</b> {JSON.parse(selectedPoint.beneficiaires).length}</div>
            {/* <div><b>Code Meso :</b> {selectedPoint.codeMeso || <i>Non renseigné</i>}</div> */}
            {/* <div><b>Code INSEE :</b> {selectedPoint.inseeCom || <i>Non renseigné</i>}</div> */}
            {/* <div><b>Code AIOT :</b> {selectedPoint.codeAiot || <i>Non renseigné</i>}</div> */}
            {/* <div><b>Code BDLISA :</b> {selectedPoint.codeBdlisa || <i>Non renseigné</i>}</div> */}
            {/* <div><b>Code BNPE :</b> {selectedPoint.codeBnpe || <i>Non renseigné</i>}</div> */}
            {/* <div><b>Code BV BdCARTHAGE :</b> {selectedPoint.codeBvBdcarthage || <i>Non renseigné</i>}</div> */}
            {/* <div><b>Code ME Continentales BV :</b> {selectedPoint.codeMeContinentalesBv || <i>Non renseigné</i>}</div> */}
            <div><b>ZRE :</b> {selectedPoint.zre ? 'oui' : 'non'}</div>
            <div><b>Remarque :</b> {selectedPoint.remarque || <i>Non renseigné</i>}</div>
            <Button
              variant='outlined'
              sx={{
                mt: 2
              }}
              onClick={() => setIsDialogOpen(true)}
            >
              Afficher les détails
            </Button>
          </Box>
        </>
      ) : (
        <Box sx={{p: 2}}>Sélectionnez un point sur la carte pour voir les détails</Box>
      )}
    </Box>
  )
}

export default SidePanel
