import {HomeOutlined} from '@mui/icons-material'
import AgricultureOutlined from '@mui/icons-material/AgricultureOutlined'
import BoltOutlined from '@mui/icons-material/BoltOutlined'
import DeviceThermostatOutlined from '@mui/icons-material/DeviceThermostatOutlined'
import EditOffOutlined from '@mui/icons-material/EditOffOutlined'
import FactoryOutlined from '@mui/icons-material/FactoryOutlined'
import InterestsOutlined from '@mui/icons-material/InterestsOutlined'
import LiquorOutlined from '@mui/icons-material/LiquorOutlined'
import LocalDrinkOutlined from '@mui/icons-material/LocalDrinkOutlined'
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import ParkOutlined from '@mui/icons-material/ParkOutlined'
import WaterOutlined from '@mui/icons-material/WaterOutlined'
import WhatshotOutlined from '@mui/icons-material/WhatshotOutlined'

const defaultTextColor = 'var(--text-default-grey)'
const lightTextColor = 'var(--text-inverted-grey)'

export const usageLabels = {
  0: 'Usage inconnu',
  1: 'Pas d’usage',
  2: 'Irrigation',
  '2A': 'Irrigation par aspersion',
  '2B': 'Irrigation gravitaire',
  '2C': 'Irrigation au goutte à goutte',
  '2D': 'Irrigation par tout autre procédé',
  '2E': 'Lutte antigel de cultures pérennes',
  '2F': 'Volume technique d’irrigation',
  3: 'Agriculture-élevage (hors irrigation)',
  '3A': 'Abreuvage',
  '3B': 'Aquaculture',
  4: 'Industrie',
  '4A': 'Agro-alimentaire',
  '4B': 'Industrie hors agro-alimentaire',
  '4C': 'Exhaure',
  '4D': 'Refroidissement avec restitution supérieure à 99 %',
  5: 'Alimentation en eau potable (AEP)',
  '5A': 'Alimentation collective',
  '5B': 'Alimentation individuelle',
  6: 'Énergie',
  '6A': 'Pompe à chaleur',
  '6B': 'Géothermie',
  '6C': 'Refroidissement de centrales de production d’énergie',
  '6C1': 'Refroidissement de centrales thermiques',
  '6C2': 'Refroidissement de centrales nucléaires',
  '6C3': 'Refroidissement des centrales de production électrique',
  '6D': 'Barrages hydro-électriques - force motrice',
  7: 'Loisirs',
  '7A': 'Bassin de natation',
  '7B': 'Baignade',
  '7C': 'Autres activités de loisir',
  '7D': 'Arrosage',
  '7E': 'Canon à neige',
  8: 'Embouteillage',
  9: 'Thermalisme et thalassothérapie',
  '9A': 'Thermalisme',
  '9B': 'Thalassothérapie',
  10: 'Défense contre incendie',
  11: 'Dépollution',
  12: 'Réalimentation d’une ressource en eau',
  '12A': 'Soutien d’étiage',
  '12B': 'Compensation évaporation',
  '12C': 'Compensation irrigation',
  '12D': 'Compensation salubrité',
  '12E': 'Remplissage plan d’eau',
  13: 'Canaux',
  '13A': 'Volume technique de navigation',
  '13B': 'Alimentation au soutien canal',
  14: 'Soutien d’étiage',
  15: 'Entretien de voiries',
  16: 'Alimentation au soutien canal',
  17: 'Usage domestique'
}

export const usageIcons = {
  0: EditOffOutlined,
  1: EditOffOutlined,
  2: ParkOutlined,
  3: AgricultureOutlined,
  '3B': WaterOutlined,
  4: FactoryOutlined,
  5: LocalDrinkOutlined,
  6: BoltOutlined,
  7: InterestsOutlined,
  8: LiquorOutlined,
  9: DeviceThermostatOutlined,
  10: WhatshotOutlined,
  11: WaterOutlined,
  12: WaterOutlined,
  13: WaterOutlined,
  14: WaterOutlined,
  15: LocalShippingOutlined,
  16: WaterOutlined,
  17: HomeOutlined
}

export const legendColors = {
  usages: [
    {key: '5', color: '#1D70B8', textColor: lightTextColor},
    {key: '2', color: '#2E7D32', textColor: lightTextColor},
    {key: '3', color: '#6B7F2A', textColor: lightTextColor},
    {key: '4', color: '#B3404A', textColor: lightTextColor},
    {key: '6', color: '#C97900', textColor: defaultTextColor},
    {key: '7', color: '#8A55B5', textColor: lightTextColor},
    {key: '8', color: '#008C95', textColor: lightTextColor},
    {key: '9', color: '#7E4EAD', textColor: lightTextColor},
    {key: '10', color: '#CE3A2B', textColor: lightTextColor},
    {key: '11', color: '#008577', textColor: lightTextColor},
    {key: '12', color: '#0096A6', textColor: lightTextColor},
    {key: '13', color: '#0063CB', textColor: lightTextColor},
    {key: '14', color: '#B06F00', textColor: defaultTextColor},
    {key: '15', color: '#6A6A6A', textColor: lightTextColor},
    {key: '16', color: '#2F6C9C', textColor: lightTextColor},
    {key: '17', color: '#6F5B3E', textColor: lightTextColor},
    {key: '1', color: '#DADADA', textColor: defaultTextColor},
    {key: '0', color: '#6A6A6A', textColor: lightTextColor}
  ],

  typesMilieu: [
    {text: 'SURFACE', color: 'var(--artwork-minor-blue-france)', textColor: lightTextColor},
    {text: 'SUPERFICIELLE', color: 'var(--artwork-minor-blue-france)', textColor: lightTextColor},
    {text: 'SOUTERRAIN', color: 'var(--artwork-minor-green-menthe)', textColor: lightTextColor},
    {text: 'TRANSITION', color: 'var(--background-flat-blue-ecume)', textColor: lightTextColor}
  ]
}

export const usageColors = Object.fromEntries(
  legendColors.usages.map(({key, color, textColor, icon}) => [
    key,
    {
      color,
      textColor,
      icon
    }
  ])
)
