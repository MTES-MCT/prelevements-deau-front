import {fr} from '@codegouvfr/react-dsfr'

const {options, decisions} = fr.colors

const defaultTextColor = decisions.text.default.grey
const lightTextColor = options.grey._1000_100.default

export const legendColors = {
  usages: [
    {text: 'Eau potable', color: options.blueCumulus.main526.default, textColor: lightTextColor},
    {text: 'Agriculture', color: options.greenArchipel.main557.default, textColor: lightTextColor},
    {text: 'Camion citerne', color: options.purpleGlycine.main494.default, textColor: lightTextColor},
    {text: 'Eau embouteillée', color: options.purpleGlycine._850_200.default, textColor: defaultTextColor},
    {text: 'Hydroélectricité', color: options.yellowMoutarde._850_200.default, textColor: defaultTextColor},
    {text: 'Industrie', color: options.redMarianne._425_625.default, textColor: lightTextColor},
    {text: 'Non renseigné', color: options.grey._900_175.default, textColor: defaultTextColor}
  ],
  typesMilieu: [
    {text: 'Eau de surface', color: options.blueFrance._850_200.default},
    {text: 'Eau souterraine', color: options.greenMenthe._850_200.default}
  ]
}

export function getUsagesColors(usage) {
  return legendColors.usages.find(u => u.text === usage)
}
