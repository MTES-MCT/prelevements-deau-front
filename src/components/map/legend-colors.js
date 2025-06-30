export const legendColors = {
  usages: [
    {text: 'Eau potable', color: '#417DC4', textColor: 'white'},
    {text: 'Agriculture', color: '#009099', textColor: 'white'},
    {text: 'Camion citerne', color: '#A558A0', textColor: 'white'},
    {text: 'Eau embouteillée', color: '#FBB8F6', textColor: 'black'},
    {text: 'Hydroélectricité', color: '#FCC63A', textColor: 'black'},
    {text: 'Industrie', color: '#F95C5E', textColor: 'white'},
    {text: 'Non renseigné', color: '#ccc', textColor: 'black'}
  ],
  typesMilieu: [
    {text: 'Eau de surface', color: 'deepskyblue'},
    {text: 'Eau souterraine', color: 'lightseagreen'}
  ]
}

export function getUsagesColors(usage) {
  return legendColors.usages.find(u => u.text === usage)
}
