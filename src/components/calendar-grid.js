/**
 * @fileoverview Composant CalendarGrid refactorisé
 * Composant principal pour l'affichage des calendriers de données
 * Gère automatiquement la granularité d'affichage selon la plage de dates
 */

import {fr} from '@codegouvfr/react-dsfr'

import CalendarGridDisplay from '@/components/ui/calendar-grid-display.js'
import LegendCalendar from '@/components/ui/legend-calendar.js'
import {useCalendarData} from '@/hook/use-calendar-data.js'

/**
 * Configuration de la légende du calendrier
 */
const LEGEND_LABELS = [
  {
    color: fr.colors.decisions.text.actionHigh.blueFrance.default,
    label: 'Données présentes'
  },
  {
    color: fr.colors.decisions.background.flat.warning.default,
    label: 'Données présentes mais anomalies'
  },
  {
    color: fr.colors.decisions.background.actionHigh.info.default,
    label: 'Pas de prélèvement'
  },
  {
    color: fr.colors.decisions.text.disabled.grey.default,
    label: 'Non déclaré / pas de déclaration'
  }
]

/**
 * Composant CalendarGrid principal
 *
 * Affiche automatiquement les données sous forme de calendriers avec la granularité optimale :
 * - Mode mois : pour les plages <= 6 mois (grille 7 colonnes avec jours)
 * - Mode année : pour les plages 6-72 mois (grille 4 colonnes avec mois)
 * - Mode multi-années : pour les plages > 72 mois (grille 4 colonnes avec années)
 *
 * @param {Object} props - Propriétés du composant
 * @param {Object[]} props.data - Données du calendrier [{date: 'dd-MM-yyyy', colorA: 'string', ...}]
 * @param {Function} [props.renderCustomTooltipContent] - Fonction personnalisée de rendu des tooltips
 * @param {Function} [props.onCellClick] - Gestionnaire de clic sur une cellule interactive
 * @returns {JSX.Element} Le composant CalendarGrid
 *
 * @example
 * <CalendarGrid
 *   data={[{date: '01-01-2024', colorA: '#1f2937'}]}
 *   onCellClick={(cellInfo) => console.log('Clicked:', cellInfo)}
 * />
 */
const CalendarGrid = ({
  data,
  renderCustomTooltipContent,
  onCellClick
}) => {
  // Utilisation du hook personnalisé pour traiter les données
  const {calendars, hasData} = useCalendarData(data)

  // Affichage de la légende seule si aucune donnée
  if (!hasData) {
    return <LegendCalendar labels={LEGEND_LABELS} />
  }

  // Affichage de la grille de calendriers avec leurs données
  return (
    <CalendarGridDisplay
      calendars={calendars}
      legendLabels={LEGEND_LABELS}
      renderTooltipContent={renderCustomTooltipContent}
      onCellClick={onCellClick}
    />
  )
}

export default CalendarGrid
