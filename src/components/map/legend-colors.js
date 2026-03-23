const defaultTextColor = 'var(--text-default-grey)'
const lightTextColor = 'var(--text-inverted-grey)'

export const usageLabels = {
  INCONNU: 'Non renseigné',
  PAS_D_USAGE: 'Pas d’usage',
  IRRIGATION: 'Irrigation',
  AGRICULTURE_ELEVAGE: 'Agriculture / élevage',
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

export const legendColors = {
  usages: [
    {key: 'AEP', color: 'var(--background-flat-blue-france)', textColor: lightTextColor},
    {key: 'AGRICULTURE_ELEVAGE', color: 'var(--background-flat-green-archipel)', textColor: lightTextColor},
    {key: 'IRRIGATION', color: 'var(--background-flat-green-menthe)', textColor: defaultTextColor},
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
    legendColors.usages.map(({key, color}) => [key, color])
)


export function getUsagesColors(usage) {
  return legendColors.usages.find(u => u.text === usage)
}
