/**
 * @fileoverview Composant Calendar amélioré pour l'accessibilité
 * Affiche une grille de cellules de calendrier avec support complet de l'accessibilité
 */

import {fr as dsfr} from '@codegouvfr/react-dsfr'
import Tooltip from '@mui/material/Tooltip'

/**
 * Cellule de placeholder invisible pour l'alignement de la grille
 * @param {Object} props - Propriétés du composant
 * @param {number} props.size - Taille de la cellule
 * @param {string} props.keyValue - Clé unique pour React
 * @returns {JSX.Element} Cellule placeholder
 */
const PlaceholderCell = ({size, keyValue}) => (
  <div
    key={keyValue}
    style={{width: size, height: size, visibility: 'hidden'}}
    aria-hidden='true'
  />
)

/**
 * Cellule individuelle du calendrier
 * @param {Object} props - Propriétés du composant
 * @param {Object} props.cellInfo - Informations de la cellule
 * @param {number} props.cellSize - Taille de la cellule
 * @param {Function} [props.renderTooltipContent] - Fonction de rendu du tooltip
 * @param {Function} [props.onClick] - Gestionnaire de clic
 * @returns {JSX.Element} Cellule du calendrier
 */
const CalendarCell = ({cellInfo, cellSize, renderTooltipContent, onClick}) => {
  const {
    key: keyValue,
    label,
    color,
    ariaLabel,
    isPlaceholder = false,
    isInteractive = false
  } = cellInfo

  if (isPlaceholder) {
    return <PlaceholderCell keyValue={keyValue} size={cellSize} />
  }

  let style = {width: cellSize, height: cellSize}
  let classes = 'rounded flex items-center justify-center text-xs sm:text-sm font-medium text-center transition-colors duration-150 ease-in-out border border-slate-200 dark:border-slate-700'

  if (color) {
    style = {...style, backgroundColor: color}
    classes += ' text-white'
  } else {
    classes += ' bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
  }

  const hasInteraction = Boolean(onClick && isInteractive)
  if (hasInteraction) {
    classes += ' cursor-pointer group focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
  }

  const handleClick = () => {
    if (hasInteraction) {
      onClick(cellInfo)
    }
  }

  const handleKeyDown = event => {
    if (hasInteraction && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onClick(cellInfo)
    }
  }

  const content = (
    <div
      className={classes}
      style={style}
      role='gridcell'
      aria-label={ariaLabel || label}
      tabIndex={hasInteraction ? 0 : -1}
      aria-disabled={hasInteraction ? undefined : true}
      aria-pressed={hasInteraction ? false : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span className={hasInteraction ? 'group-hover:hidden group-focus:hidden' : undefined}>
        {label}
      </span>
      {hasInteraction && (
        <span
          className='hidden group-hover:inline-flex group-focus:inline-flex fr-icon-search-line'
          aria-hidden='true'
        />
      )}
    </div>
  )

  const tooltipContent = renderTooltipContent ? renderTooltipContent(cellInfo) : ariaLabel || label

  if (!tooltipContent) {
    return content
  }

  return (
    <Tooltip arrow enterNextDelay={400} title={tooltipContent}>
      {content}
    </Tooltip>
  )
}

/**
 * Composant Calendar principal
 * Affiche une grille de cellules de calendrier avec titre et support de l'interaction
 *
 * @param {Object} props - Propriétés du composant
 * @param {string} [props.title] - Titre du calendrier
 * @param {Object[]} props.cells - Liste des cellules à afficher
 * @param {boolean} [props.compactMode=false] - Mode compact (4 colonnes au lieu de 7)
 * @param {Function} [props.renderTooltipContent] - Fonction de rendu du contenu des tooltips
 * @param {Function} [props.onCellClick] - Gestionnaire de clic sur une cellule
 * @returns {JSX.Element} Le composant Calendar
 */
const Calendar = ({
  title,
  cells,
  compactMode = false,
  renderTooltipContent,
  onCellClick
}) => {
  const cellSize = compactMode ? 60 : 35
  const computedColumns = compactMode ? 4 : 7

  // Helper pour générer l'id du titre du calendrier
  const getCalendarTitleId = title =>
    `calendar-title-${title.replaceAll(/\s+/g, '-').toLowerCase()}`

  const calendarTitleId = title ? getCalendarTitleId(title) : undefined

  return (
    <div
      style={{backgroundColor: dsfr.colors.decisions.background.default}}
      role='region'
      aria-label={title ? `Calendrier ${title}` : 'Calendrier'}
    >
      {title && (
        <h3
          className='text-center mb-3 text-lg font-semibold'
          id={calendarTitleId}
        >
          {title}
        </h3>
      )}
      <div
        className='grid justify-center gap-1'
        role='grid'
        aria-labelledby={calendarTitleId}
        aria-label={title ? undefined : 'Grille de calendrier'}
        style={{gridTemplateColumns: `repeat(${computedColumns}, max-content)`}}
      >
        {cells.map(cell => (
          <CalendarCell
            key={cell.key}
            cellInfo={cell}
            cellSize={cellSize}
            renderTooltipContent={renderTooltipContent}
            onClick={onCellClick}
          />
        ))}
      </div>
    </div>
  )
}

export default Calendar
