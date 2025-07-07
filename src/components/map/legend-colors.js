const defaultTextColor = 'var(--text-default-grey)'
const lightTextColor = 'var(--text-inverted-grey)'

export const legendColors = {
  usages: [
    {text: 'Eau potable', color: 'var(--background-flat-blue-cumulus)', textColor: lightTextColor},
    {text: 'Agriculture', color: 'var(--background-flat-green-archipel)', textColor: lightTextColor},
    {text: 'Camion citerne', color: 'var(--artwork-major-green-archipel-hover)', textColor: lightTextColor},
    {text: 'Eau embouteillée', color: 'var(--artwork-motif-purple-glycine)', textColor: defaultTextColor},
    {text: 'Hydroélectricité', color: 'var(--background-contrast-yellow-moutarde-active)', textColor: defaultTextColor},
    {text: 'Industrie', color: 'var(--artwork-major-red-marianne-active)', textColor: lightTextColor},
    {text: 'Non renseigné', color: 'var(--artwork-motif-grey)', textColor: defaultTextColor}
  ],
  typesMilieu: [
    {text: 'Eau de surface', color: 'var(--artwork-minor-blue-france)', textColor: lightTextColor},
    {text: 'Eau souterraine', color: 'var(--artwork-minor-green-menthe)', textColor: lightTextColor}
  ]
}

export function getUsagesColors(usage) {
  return legendColors.usages.find(u => u.text === usage)
}
