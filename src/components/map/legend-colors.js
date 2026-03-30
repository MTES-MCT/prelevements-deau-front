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
  INCONNU: 'Non renseigné',
  PAS_D_USAGE: 'Pas d’usage',
  IRRIGATION: 'Irrigation',
  AGRICULTURE_ELEVAGE: 'Agriculture / élevage',
  AQUACULTURE: 'Aquaculture',
  INDUSTRIE: 'Industrie',
  AEP: 'Alimentation eau potable (AEP)',
  ENERGIE: 'Énergie / hydroélectricité',
  LOISIRS: 'Loisirs',
  EMBOUTEILLAGE: 'Embouteillage',
  THERMALISME_THALASSO: 'Thermalisme / thalasso',
  DEFENSE_INCENDIE: 'Défense incendie',
  REALIMENTATION_EAU: 'Soutien d’étiage / réalimentation',
  CANAUX: 'Canaux',
  ETIAGE: 'Soutien d’étiage',
  ENTRETIEN_VOIRIES: 'Entretien voiries',
  ALIMENTATION_SOUTIEN_CANAL: 'Alimentation canal',
  DOMESTIQUE: 'Usage domestique'
}

export const usageIcons = {
  AEP: LocalDrinkOutlined,
  AGRICULTURE_ELEVAGE: AgricultureOutlined,
  AQUACULTURE: WaterOutlined,
  IRRIGATION: ParkOutlined,
  INDUSTRIE: FactoryOutlined,
  ENERGIE: BoltOutlined,
  EMBOUTEILLAGE: LiquorOutlined,
  DEFENSE_INCENDIE: WhatshotOutlined,
  REALIMENTATION_EAU: WaterOutlined,
  CANAUX: WaterOutlined,
  ETIAGE: WaterOutlined,
  ALIMENTATION_SOUTIEN_CANAL: WaterOutlined,
  THERMALISME_THALASSO: DeviceThermostatOutlined,
  LOISIRS: InterestsOutlined,
  DOMESTIQUE: HomeOutlined,
  ENTRETIEN_VOIRIES: LocalShippingOutlined,
  PAS_D_USAGE: EditOffOutlined,
  INCONNU: EditOffOutlined
}

export const legendColors = {
  usages: [
    {key: 'AEP', color: 'var(--background-flat-blue-france)', textColor: lightTextColor},
    {key: 'AGRICULTURE_ELEVAGE', color: 'var(--background-flat-green-archipel)', textColor: lightTextColor},
    {key: 'AQUACULTURE', color: 'var(--background-flat-blue-ecume)', textColor: lightTextColor},
    {key: 'IRRIGATION', color: 'var(--background-flat-green-menthe)', textColor: lightTextColor},
    {key: 'INDUSTRIE', color: 'var(--artwork-major-red-marianne-active)', textColor: lightTextColor},
    {key: 'ENERGIE', color: 'var(--background-flat-yellow-tournesol)', textColor: defaultTextColor},
    {key: 'LOISIRS', color: 'var(--background-flat-pink-macaron)', textColor: defaultTextColor},
    {key: 'THERMALISME_THALASSO', color: 'var(--artwork-minor-purple-glycine)', textColor: lightTextColor},
    {key: 'EMBOUTEILLAGE', color: 'var(--background-flat-blue-cumulus)', textColor: lightTextColor},
    {key: 'DEFENSE_INCENDIE', color: 'var(--background-flat-red-marianne)', textColor: lightTextColor},
    {key: 'REALIMENTATION_EAU', color: 'var(--background-flat-blue-ecume)', textColor: defaultTextColor},
    {key: 'CANAUX', color: 'var(--background-flat-blue-cumulus)', textColor: lightTextColor},
    {key: 'ENTRETIEN_VOIRIES', color: 'var(--artwork-motif-grey)', textColor: defaultTextColor},
    {key: 'DOMESTIQUE', color: 'var(--background-flat-brown-cafe-creme)', textColor: lightTextColor},
    {key: 'PAS_D_USAGE', color: 'var(--background-flat-grey)', textColor: defaultTextColor},
    {key: 'INCONNU', color: 'var(--artwork-motif-grey)', textColor: defaultTextColor}
  ],

  typesMilieu: [
    {text: 'SURFACE', color: 'var(--artwork-minor-blue-france)', textColor: lightTextColor},
    {text: 'SOUTERRAIN', color: 'var(--artwork-minor-green-menthe)', textColor: lightTextColor}
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
