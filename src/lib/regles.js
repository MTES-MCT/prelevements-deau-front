import BloodtypeOutlinedIcon from '@mui/icons-material/BloodtypeOutlined'
import DeviceThermostatOutlinedIcon from '@mui/icons-material/DeviceThermostatOutlined'
import HeightOutlinedIcon from '@mui/icons-material/HeightOutlined'
import LocalDrinkOutlinedIcon from '@mui/icons-material/LocalDrinkOutlined'
import OfflineBoltOutlinedIcon from '@mui/icons-material/OfflineBoltOutlined'
import OilBarrelOutlinedIcon from '@mui/icons-material/OilBarrelOutlined'
import OpacityOutlinedIcon from '@mui/icons-material/OpacityOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import WaterOutlinedIcon from '@mui/icons-material/WaterOutlined'

const regleParametres = [
  {name: 'Volume annuel', label: 'Volume prélevé annuel', icon: <OpacityOutlinedIcon />},
  {name: 'Volume mensuel', label: 'Volume prélevé mensuel', icon: <OpacityOutlinedIcon />},
  {name: 'Volume journalier', label: 'Volume prélevé journalier', icon: <OpacityOutlinedIcon />},
  {name: 'Débit prélevé', label: 'Débit prélevé', icon: <OilBarrelOutlinedIcon />},
  {name: 'Débit réservé', label: 'Débit réservé', icon: <WaterOutlinedIcon />},
  {name: 'Niveau piézométrique', label: 'Niveau piézométrique', icon: <HeightOutlinedIcon />},
  {name: 'Conductivité électrique', label: 'Conductivité électrique', icon: <OfflineBoltOutlinedIcon />},
  {name: 'Température', label: 'Conductivité électrique', icon: <DeviceThermostatOutlinedIcon />},
  {name: 'Chlorures', label: 'Concentration en chlorures', icon: <ScienceOutlinedIcon />},
  {name: 'Nitrates', label: 'Concentration en nitrates', icon: <ScienceOutlinedIcon />},
  {name: 'Sulfates', label: 'Concentration en sulfates', icon: <ScienceOutlinedIcon />},
  {name: 'Ph', label: 'Ph', icon: <BloodtypeOutlinedIcon />},
  {name: 'Turbidité', label: 'Turbidité', icon: <LocalDrinkOutlinedIcon />}
]

const regleContrainte = [
  {name: 'minimum', label: '>'},
  {name: 'maximum', label: '<'},
  {name: 'moyenne', label: '≃'}
]

export const getParametreInfo = parametre => {
  const parametreItem = regleParametres.find(param => param.name === parametre)
  return parametreItem ? {label: parametreItem.label, icon: parametreItem.icon} : undefined
}

export const getRegleContrainte = contrainte => {
  const contrainteItem = regleContrainte.find(param => param.name === contrainte)
  return contrainteItem ? contrainteItem.label : undefined
}
