/**
 * @fileoverview Composant de grille de calendriers
 * Responsable de l'affichage d'une grille de calendriers avec leur légende
 */

import Calendar from '@/components/ui/calendar.js'
import LegendCalendar from '@/components/ui/legend-calendar.js'

/**
 * Composant de grille de calendriers
 * Affiche une collection de calendriers dans une grille responsive avec leur légende
 *
 * @param {Object} props - Les propriétés du composant
 * @param {Object[]} props.calendars - Liste des calendriers à afficher
 * @param {Object[]} props.legendLabels - Configuration de la légende
 * @param {Function} [props.renderTooltipContent] - Fonction de rendu du contenu des tooltips
 * @param {Function} [props.onCellClick] - Gestionnaire de clic sur une cellule
 * @returns {JSX.Element} La grille de calendriers
 */
const CalendarGridDisplay = ({
  calendars,
  legendLabels,
  renderTooltipContent,
  onCellClick
}) => {
  /**
   * Gestionnaire de rendu des tooltips
   * @param {Object} cellInfo - Informations de la cellule
   * @returns {string|null} Contenu du tooltip
   */
  const tooltipRenderer = renderTooltipContent
    ? cellInfo => renderTooltipContent(cellInfo)
    : undefined

  /**
   * Gestionnaire de clic sur les cellules
   * Ne déclenche le clic que si la cellule est interactive
   * @param {Object} cellInfo - Informations de la cellule
   */
  const clickHandler = onCellClick
    ? cellInfo => {
      if (cellInfo.isInteractive) {
        onCellClick(cellInfo)
      }
    }
    : undefined

  return (
    <div
      className='flex flex-col p-3 gap-3'
      role='region'
      aria-label='Grille de calendriers de données'
    >
      {/* Grille des calendriers */}
      <div
        className='grid gap-6 w-full'
        style={{gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 270px))'}}
        role='group'
        aria-label='Calendriers de données par période'
      >
        {calendars.map(calendar => (
          <div
            key={calendar.key}
            className='flex flex-col items-center'
            style={{width: '270px'}}
          >
            <Calendar
              title={calendar.title}
              cells={calendar.cells}
              compactMode={calendar.compactMode}
              renderTooltipContent={tooltipRenderer}
              onCellClick={clickHandler}
            />
          </div>
        ))}
      </div>

      {/* Légende */}
      {legendLabels && (
        <LegendCalendar
          labels={legendLabels}
          aria-label='Légende des couleurs du calendrier'
        />
      )}
    </div>
  )
}

export default CalendarGridDisplay
