import {Highlight} from '@codegouvfr/react-dsfr/Highlight'
import {Box} from '@mui/material'

const InfoBox = ({label, value}) => {
  if (!value) {
    return null
  }

  return (
    <Box>
      <b>{label} :</b> {value}
    </Box>
  )
}

const Modalite = ({modalite}) => (
  <>
    <InfoBox label='Débit prélevé' value={modalite.freq_debit_preleve} />
    <InfoBox label='Débit réservé' value={modalite.freq_debit_reserve} />
    <InfoBox label='Volume prélevé' value={modalite.freq_volume_preleve} />
    <InfoBox label='Niveau Eau' value={modalite.freq_niveau_eau} />
    <InfoBox label='Chlorure' value={modalite.freq_chlorures} />
    <InfoBox label='Conductivité' value={modalite.freq_conductivite} />
    <InfoBox label='Nitrates' value={modalite.freq_nitrates} />
    <InfoBox label='PH' value={modalite.freq_ph} />
    <InfoBox label='Sulfates' value={modalite.freq_sulfates} />
    <InfoBox label='Temperature' value={modalite.freq_temperature} />
    <InfoBox label='Turbidité' value={modalite.freq_turbidite} />
    {modalite.remarque && (
      <Highlight>
        <b>Remarque :</b> <i>{modalite.remarque}</i>
      </Highlight>
    )}
    <hr className='my-2' />
  </>
)

export default Modalite
