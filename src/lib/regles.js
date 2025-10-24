import BloodtypeOutlinedIcon from '@mui/icons-material/BloodtypeOutlined'
import DeviceThermostatOutlinedIcon from '@mui/icons-material/DeviceThermostatOutlined'
import HeightOutlinedIcon from '@mui/icons-material/HeightOutlined'
import LocalDrinkOutlinedIcon from '@mui/icons-material/LocalDrinkOutlined'
import OfflineBoltOutlinedIcon from '@mui/icons-material/OfflineBoltOutlined'
import OilBarrelOutlinedIcon from '@mui/icons-material/OilBarrelOutlined'
import OpacityOutlinedIcon from '@mui/icons-material/OpacityOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import WaterOutlinedIcon from '@mui/icons-material/WaterOutlined'

const regleParametres = {
  'Volume annuel': {label: 'Volume prélevé annuel', icon: <OpacityOutlinedIcon />},
  'Volume mensuel': {label: 'Volume prélevé mensuel', icon: <OpacityOutlinedIcon />},
  'Volume journalier': {label: 'Volume prélevé journalier', icon: <OpacityOutlinedIcon />},
  'Débit prélevé': {label: 'Débit prélevé', icon: <OilBarrelOutlinedIcon />},
  'Débit réservé': {label: 'Débit réservé', icon: <WaterOutlinedIcon />},
  'Niveau piézométrique': {label: 'Niveau piézométrique', icon: <HeightOutlinedIcon />},
  'Conductivité électrique': {label: 'Conductivité électrique', icon: <OfflineBoltOutlinedIcon />},
  Température: {label: 'Conductivité électrique', icon: <DeviceThermostatOutlinedIcon />},
  Chlorures: {label: 'Concentration en chlorures', icon: <ScienceOutlinedIcon />},
  Nitrates: {label: 'Concentration en nitrates', icon: <ScienceOutlinedIcon />},
  Sulfates: {label: 'Concentration en sulfates', icon: <ScienceOutlinedIcon />},
  Ph: {label: 'Ph', icon: <BloodtypeOutlinedIcon />},
  Turbidité: {label: 'Turbidité', icon: <LocalDrinkOutlinedIcon />}
}

const regleContrainte = {
  minimum: '>',
  maximum: '<',
  moyenne: '≃'
}

export const getParametreInfo = parametre => regleParametres[parametre]
export const getRegleContrainte = contrainte => regleContrainte[contrainte]
