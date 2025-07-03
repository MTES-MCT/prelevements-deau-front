import {legendColors} from '@/components/map/legend-colors.js'

// Fonction utilitaire pour récupérer la couleur associée à un usage
export const getUsageColor = usage => {
  const {color: background, textColor} = legendColors.usages.find(u => u.text === usage) || {}
  return {background, textColor}
}

// Fonction utilitaire pour récupérer la couleur associée au type de milieu
export const getTypeMilieuColor = typeMilieu => {
  const typeItem = legendColors.typesMilieu.find(t => t.text === typeMilieu)
  return typeItem ? typeItem.color : undefined
}
