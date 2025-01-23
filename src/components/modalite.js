import {Box, Grid2} from '@mui/material'

const frequences = {
  1: 'Seconde',
  2: 'Minute',
  3: 'Quinze minutes',
  4: 'Heure',
  5: 'Jour',
  6: 'Semaine',
  7: 'Mois',
  8: 'Trimetre',
  9: 'Année',
  10: 'Autre',
  11: 'Non renseigné'
}

const Modalite = ({modalite}) => (
  <Grid2
    container
    spacing={2}
    sx={{
      p: 2,
      justifyContent: 'space-around'
    }}
  >
    <Box>
      <Box><b>Débit prélevé :</b> {frequences[modalite.freq_debit_preleve] || <i>Non renseigné</i>}</Box>
      <Box><b>Débit réservé :</b> {frequences[modalite.freq_debit_reserve] || <i>Non renseigné</i>}</Box>
      <Box><b>Volume prélevé :</b> {frequences[modalite.freq_volume_preleve] || <i>Non renseigné</i>}</Box>
    </Box>
    <Box>
      <Box><b>Niveau Eau :</b> {frequences[modalite.freq_niveau_eau] || <i>Non renseigné</i>}</Box>
      <Box><b>Chlorure :</b> {frequences[modalite.freq_chlorures] || <i>Non renseigné</i>}</Box>
      <Box><b>Conductivité :</b> {frequences[modalite.freq_conductivite] || <i>Non renseigné</i>}</Box>
    </Box>
    <Box>
      <Box><b>Nitrates :</b> {frequences[modalite.freq_nitrates] || <i>Non renseigné</i>}</Box>
      <Box><b>PH :</b> {frequences[modalite.freq_ph] || <i>Non renseigné</i>}</Box>
      <Box><b>Sulfates :</b> {frequences[modalite.freq_sutlfates] || <i>Non renseigné</i>}</Box>
    </Box>
    <Box>
      <Box><b>Temperature :</b> {frequences[modalite.freq_temperature] || <i>Non renseigné</i>}</Box>
      <Box><b>Turbidité :</b> {frequences[modalite.freq_turbidite] || <i>Non renseigné</i>}</Box>
    </Box>
    <Box>
      <b>Remarque :</b> <i>{modalite.remarque || 'Non renseigné'}</i>
    </Box>
  </Grid2>
)

export default Modalite
