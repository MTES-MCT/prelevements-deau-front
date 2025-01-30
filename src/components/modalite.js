import {Highlight} from '@codegouvfr/react-dsfr/Highlight'
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

const InfoBox = ({label, value}) => (
  <Box className='flex align-middle justify-between'>
    <b>{label} :</b> {value || <i>Non renseigné</i>}
  </Box>
)

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
      <InfoBox label='Débit prélevé' value={frequences[modalite.freq_debit_preleve]} />
      <InfoBox label='Débit réservé' value={frequences[modalite.freq_debit_reserve]} />
      <InfoBox label='Volume prélevé' value={frequences[modalite.freq_volume_preleve]} />
    </Box>
    <Box>
      <InfoBox label='Niveau Eau' value={frequences[modalite.freq_niveau_eau]} />
      <InfoBox label='Chlorure' value={frequences[modalite.freq_chlorures]} />
      <InfoBox label='Conductivité' value={frequences[modalite.freq_conductivite]} />
    </Box>
    <Box>
      <InfoBox label='Nitrates' value={frequences[modalite.freq_nitrates]} />
      <InfoBox label='PH' value={frequences[modalite.freq_ph]} />
      <InfoBox label='Sulfates' value={frequences[modalite.freq_sutlfates]} />
    </Box>
    <Box>
      <InfoBox label='Temperature' value={frequences[modalite.freq_temperature]} />
      <InfoBox label='Turbidité' value={frequences[modalite.freq_turbidite]} />
    </Box>
    <Highlight>
      <b>Remarque :</b> <i>{modalite.remarque || 'Non renseigné'}</i>
    </Highlight>
  </Grid2>
)

export default Modalite
