import {Box} from '@mui/material'

const Beneficiaire = ({beneficiaire}) => (
  <Box key={beneficiaire.id_beneficiaire} sx={{pb: 2}}>
    <Box><b>Nom :</b> {beneficiaire.nom || <i>Non renseigné</i>}</Box>
    <Box><b>Prénom :</b> {beneficiaire.prenom || <i>Non renseigné</i>}</Box>
    <Box><b>Raison sociale :</b> {beneficiaire.raison_sociale || <i>Non renseigné</i>}</Box>
    <Box><b>Sigle :</b> {beneficiaire.sigle || <i>Non renseigné</i>}</Box>
  </Box>
)

export default Beneficiaire
