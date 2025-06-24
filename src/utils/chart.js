import {uniqBy} from 'lodash-es'

import {formatNumber} from '@/utils/number.js'

/**
 * Construit les séries pour le composant LineChart.
 * @param {Object} options
 * @param {Array<{ nom_parametre: string, unite: string }>} options.parameters - Paramètres sélectionnés.
 * @param {Array<{ nom_parametre: string }>} options.allParameters - Tous les paramètres disponibles.
 * @param {Array<{ values: any[] }>} options.values - Valeurs des paramètres dans l'ordre de allParameters.
 * @param {Set<string>} options.hiddenIds - Ensemble de noms de paramètres masqués.
 * @param {Object<string, string>} options.unitToAxisId - Mapping unité -> axe ('left'|'right').
 * @returns {Array<Object>} Séries formatées pour le graphique.
 */
export function buildSeries({
  parameters, // Paramètres visibles (sélectionnés)
  allParameters, // Liste complète des paramètres pour la granularité courante
  values,
  unitToAxisId // { 'm³/h': 'left', 'µS/cm': 'right' }
}) {
  // Retirer les entrées nulles et dédupliquer par nom_parametre
  const dedupedParams = uniqBy(parameters.filter(Boolean), 'nom_parametre')

  return dedupedParams
    .map(p => {
      // Index réel de la colonne dans le tableau values
      const realIdx
        = allParameters.findIndex(ap => ap?.nom_parametre === p.nom_parametre)

      return {
        id: p.nom_parametre,
        label: `${p.nom_parametre} (${p.unite})`,
        yAxisKey: unitToAxisId[p.unite],
        data: values.map(v => v.values[realIdx]),
        showMark: false,
        curve: 'linear',
        valueFormatter: v => v === null || v === undefined ? 'Aucune donnée' : formatNumber(v)
      }
    })
}
