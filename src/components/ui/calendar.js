import {fr as dsfr} from '@codegouvfr/react-dsfr'
import Tooltip from '@mui/material/Tooltip'

const PlaceholderCell = ({size, keyValue}) => (
  <div
    key={keyValue}
    style={{width: size, height: size, visibility: 'hidden'}}
    aria-hidden='true'
  />
)

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
    classes += ' cursor-pointer group'
  }

  const content = (
    <div
      className={classes}
      style={style}
      role='gridcell'
      aria-label={ariaLabel || label}
      onClick={hasInteraction ? () => onClick(cellInfo) : undefined}
    >
      <span className={hasInteraction ? 'group-hover:hidden' : undefined}>{label}</span>
      {hasInteraction && (
        <span className='hidden group-hover:inline-flex fr-icon-search-line' aria-hidden='true' />
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

const Calendar = ({
  title,
  cells,
  compactMode = false,
  renderTooltipContent,
  onCellClick
}) => {
  const cellSize = compactMode ? 60 : 35
  const computedColumns = compactMode ? 4 : 7

  return (
    <div
      style={{backgroundColor: dsfr.colors.decisions.background.default}}
    >
      {title && <h2 className='text-center mb-3'>{title}</h2>}
      <div
        className='grid justify-center gap-1'
        role='grid'
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
