'use client'

import {Box, Typography} from '@mui/material'

const SidePanel = ({selectedPoint}) => (
  <Box
    component='div'
    sx={{
      width: '40%',
      p: 2
    }}
  >
    <Typography variant='h5'>Informations sur les points de prélèvement :</Typography>
    {selectedPoint ? (
      <Box
        component='div'
        sx={{
          p: 2
        }}
      >
        <div><b>Nom :</b> {selectedPoint.nom || <i>Non renseigné</i>}</div>
        <div><b>Cours d’eau :</b> {selectedPoint.coursEau || <i>Non renseigné</i>}</div>
        <div><b>Précision :</b> {selectedPoint.precision || <i>Non renseigné</i>}</div>
        <div><b>Autres noms :</b> {selectedPoint.autresNoms || <i>Non renseigné</i>}</div>
        <div><b>Détail localisation :</b> {selectedPoint.detailLocalisation || <i>Non renseigné</i>}</div>
        <div><b>Profondeur :</b> {selectedPoint.profondeur || <i>Non renseigné</i>}</div>
        <div><b>Remarque :</b> {selectedPoint.remarque || <i>Non renseigné</i>}</div>
        <div><b>Réservoir biologique :</b> {selectedPoint.reservoirBiologique || <i>Non renseigné</i>}</div>
        <div><b>Type de milieu :</b> {selectedPoint.typeMilieu || <i>Non renseigné</i>}</div>
        <div><b>Code Meso :</b> {selectedPoint.codeMeso || <i>Non renseigné</i>}</div>
        <div><b>Code INSEE :</b> {selectedPoint.inseeCom || <i>Non renseigné</i>}</div>
        <div><b>Code AIOT :</b> {selectedPoint.codeAiot || <i>Non renseigné</i>}</div>
        <div><b>Code BDLISA :</b> {selectedPoint.codeBdlisa || <i>Non renseigné</i>}</div>
        <div><b>Code BNPE :</b> {selectedPoint.codeBnpe || <i>Non renseigné</i>}</div>
        <div><b>Code BV BdCARTHAGE :</b> {selectedPoint.codeBvBdcarthage || <i>Non renseigné</i>}</div>
        <div><b>Code ME Continentales BV :</b> {selectedPoint.codeMeContinentalesBv || <i>Non renseigné</i>}</div>
        <div><b>ZRE :</b> {selectedPoint.zre ? 'oui' : 'non'}</div>
      </Box>
    ) : (
      <Box sx={{p: 2}}>Sélectionnez un point sur la carte pour voir les détails</Box>
    )}
  </Box>
)

export default SidePanel
