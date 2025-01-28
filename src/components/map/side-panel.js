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
  1: 'Eau de surface',
  2: 'Eau souterraine',
  3: 'Eaux de transition'
}

function cleanAutresNoms(autresNoms) {
  if (!autresNoms) {
    return null
  }

  const cleanedStr = autresNoms.replaceAll(/[{}"]/g, '')
  const result = [...new Set(cleanedStr.split(','))].join(', ')

  return result
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
          <Box>
            <Typography variant='h5'>{selectedPoint.nom || <i>Pas de nom renseigné</i>}</Typography>
            <Box
              sx={{
                fontSize: '0.8rem',
                fontStyle: 'italic',
                p: 2
              }}
            >
              <Box>Autres noms :</Box>
              <Box>{cleanAutresNoms(selectedPoint.autres_noms) || <i>pas d’autres noms</i>}</Box>
            </Box>
            <Box>
              <Box>Usage : {selectedPoint.usage || <i>Non renseigné</i>}</Box>
              <Box>Type de milieu : {selectedPoint.typeMilieu || <i>Non renseigné</i>}</Box>
            </Box>
          </Box>
          <Box
            component='div'
            sx={{
              p: 2
            }}
          >
            <div><b>Détail localisation :</b> {selectedPoint.detail_localisation || <i>Non renseigné</i>}</div>
            <div><b>Cours d’eau :</b> {selectedPoint.cours_eau || <i>Non renseigné</i>}</div>
            <div><b>Type de milieu :</b> {typesMilieu[selectedPoint.type_milieu] || <i>Non renseigné</i>}</div>
            <div><b>Usage : </b> {selectedPoint.usage || <i>Non renseigné</i>}</div>
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
