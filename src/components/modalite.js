import {fr} from '@codegouvfr/react-dsfr'
import BloodtypeOutlinedIcon from '@mui/icons-material/BloodtypeOutlined'
import DeviceThermostatOutlinedIcon from '@mui/icons-material/DeviceThermostatOutlined'
import HeightOutlinedIcon from '@mui/icons-material/HeightOutlined'
import LocalDrinkOutlinedIcon from '@mui/icons-material/LocalDrinkOutlined'
import OfflineBoltOutlinedIcon from '@mui/icons-material/OfflineBoltOutlined'
import OilBarrelOutlinedIcon from '@mui/icons-material/OilBarrelOutlined'
import OpacityOutlinedIcon from '@mui/icons-material/OpacityOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import WaterOutlinedIcon from '@mui/icons-material/WaterOutlined'
import {Box} from '@mui/material'

import CompactAlert from '@/components/ui/CompactAlert/index.js'
import InfoBox from '@/components/ui/InfoBox/index.js'

const Modalite = ({modalite}) => (
  <Box
    sx={{
      backgroundColor: fr.colors.decisions.background.alt.grey.default,
      padding: '10px',
      marginTop: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      border: `1px solid ${fr.colors.decisions.border.default.grey.default}`
    }}
  >
    <Box className='flex flex-wrap gap-2'>
      <InfoBox label='Débit prélevé' description={modalite.freq_debit_preleve} icon={<OilBarrelOutlinedIcon />} />
      <InfoBox label='Débit réservé' description={modalite.freq_debit_reserve} icon={<WaterOutlinedIcon />} />
      <InfoBox label='Volume prélevé' description={modalite.freq_volume_preleve} icon={<OpacityOutlinedIcon />} />
      <InfoBox label='Niveau Eau' description={modalite.freq_niveau_eau} icon={<HeightOutlinedIcon />} />
      <InfoBox label='Chlorure' description={modalite.freq_chlorures} icon={<ScienceOutlinedIcon />} />
      <InfoBox label='Conductivité' description={modalite.freq_conductivite} icon={<OfflineBoltOutlinedIcon />} />
      <InfoBox label='Nitrates' description={modalite.freq_nitrates} icon={<ScienceOutlinedIcon />} />
      <InfoBox label='PH' description={modalite.freq_ph} icon={<BloodtypeOutlinedIcon />} />
      <InfoBox label='Sulfates' description={modalite.freq_sulfates} icon={<ScienceOutlinedIcon />} />
      <InfoBox label='Température' description={modalite.freq_temperature} icon={<DeviceThermostatOutlinedIcon />} />
      <InfoBox label='Turbidité' description={modalite.freq_turbidite} icon={<LocalDrinkOutlinedIcon />} />
    </Box>

    {modalite.remarque && <CompactAlert label={`Remarque : ${modalite.remarque}`} alertType='info' />}
  </Box>
)

export default Modalite
