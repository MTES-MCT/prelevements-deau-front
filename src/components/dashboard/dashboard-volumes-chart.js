'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  getUsageColor,
  getUsageLabel
} from '@/lib/water-uses.js'

const EMPTY_ARRAY = []
const SVG_WIDTH = 960
const SVG_HEIGHT = 320
const MARGIN = {
  top: 34,
  right: 18,
  bottom: 42,
  left: 94
}
const CHART_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right
const CHART_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom

function formatExactVolume(value) {
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: value >= 100 ? 0 : 1
  }).format(value)} m³`
}

function formatCompactVolume(value) {
  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 1}).format(value / 1_000_000)} M m³`
  }

  if (value >= 1000) {
    return `${new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 1}).format(value / 1000)} k m³`
  }

  return formatExactVolume(value)
}

function formatPercentage(value) {
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: value >= 10 ? 1 : 2
  }).format(value)} %`
}

function getNiceMax(value) {
  if (value <= 0) {
    return 1
  }

  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  let niceNormalized = 10

  if (normalized <= 1) {
    niceNormalized = 1
  } else if (normalized <= 2) {
    niceNormalized = 2
  } else if (normalized <= 5) {
    niceNormalized = 5
  }

  return niceNormalized * magnitude
}

function getUsageId(usage) {
  return usage?.id ?? usage?.code ?? getUsageLabel(usage)
}

function getVisibleMonthUsages(month, visibleUsageIds) {
  return (month.usages ?? []).filter(item => visibleUsageIds.has(getUsageId(item.usage)))
}

function getVisibleMonthTotal(month, visibleUsageIds) {
  return getVisibleMonthUsages(month, visibleUsageIds)
    .reduce((total, item) => total + item.volume, 0)
}

function getWaterBodyTypeValue(option) {
  return option.value
}

function getAllWaterBodyTypeValues(options) {
  return options.map(option => getWaterBodyTypeValue(option))
}

function getWaterBodyTypesLabel(options, selectedValues) {
  if (selectedValues.length === 0) {
    return 'Aucun milieu'
  }

  if (selectedValues.length === options.length) {
    return 'Tous les milieux'
  }

  if (selectedValues.length === 1) {
    return options.find(option => option.value === selectedValues[0])?.label ?? selectedValues[0]
  }

  return `${selectedValues.length} types de milieu`
}

function useVisibleUsages(usages) {
  const usageIds = useMemo(() =>
    usages.map(item => getUsageId(item.usage)).filter(Boolean), [usages])
  const [visibleUsageIds, setVisibleUsageIds] = useState(() => new Set(usageIds))

  useEffect(() => {
    setVisibleUsageIds(new Set(usageIds))
  }, [usageIds])

  function toggleUsage(usageId) {
    setVisibleUsageIds(current => {
      const next = new Set(current)

      if (next.has(usageId) && next.size > 1) {
        next.delete(usageId)
      } else {
        next.add(usageId)
      }

      return next
    })
  }

  return [visibleUsageIds, toggleUsage]
}

const WaterBodyTypesMultiselect = ({
  disabled,
  id,
  onChange,
  options,
  value
}) => {
  const containerRef = useRef(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleToggle(optionValue) {
    const allValues = getAllWaterBodyTypeValues(options)
    const currentValues = value
    const nextValues = currentValues.includes(optionValue)
      ? currentValues.filter(candidate => candidate !== optionValue)
      : allValues.filter(candidate => currentValues.includes(candidate) || candidate === optionValue)

    onChange(nextValues)
  }

  return (
    <div ref={containerRef} className='relative fr-select-group mb-0'>
      <label className='fr-label' htmlFor={id}>
        Type de milieu
      </label>
      <button
        aria-expanded={open}
        className='fr-select mt-2 block w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-left disabled:cursor-not-allowed'
        disabled={disabled}
        id={id}
        type='button'
        onClick={() => setOpen(previous => !previous)}
      >
        {getWaterBodyTypesLabel(options, value)}
      </button>

      {open && (
        <div className='absolute left-0 right-0 top-full z-20 border border-gray-300 bg-white p-2 shadow-lg'>
          {options.map(option => (
            <label
              key={option.value}
              className='flex cursor-pointer items-center gap-2 px-2 py-1 text-sm hover:bg-gray-100'
            >
              <input
                checked={value.includes(option.value)}
                className='cursor-pointer'
                type='checkbox'
                value={option.value}
                onChange={() => handleToggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const DashboardVolumesChart = ({
  chart,
  isLoading,
  onWaterBodyTypesChange,
  onYearChange,
  selectedWaterBodyTypes,
  selectedYear,
  subtitle,
  waterBodyTypeOptions,
  yearOptions
}) => {
  const wrapperRef = useRef(null)
  const usages = chart?.usages ?? EMPTY_ARRAY
  const months = chart?.months ?? EMPTY_ARRAY
  const [visibleUsageIds, toggleUsage] = useVisibleUsages(usages)
  const [tooltip, setTooltip] = useState(null)

  const visibleTotals = useMemo(() =>
    months.map(month => getVisibleMonthTotal(month, visibleUsageIds)),
  [months, visibleUsageIds])
  const maxTotal = Math.max(...visibleTotals, 0)
  const yMax = getNiceMax(maxTotal * 1.12)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => yMax * ratio)
  const barSlotWidth = CHART_WIDTH / Math.max(months.length, 1)
  const barWidth = Math.min(48, barSlotWidth * 0.58)
  const hasData = maxTotal > 0

  function yScale(value) {
    return (MARGIN.top + CHART_HEIGHT) - ((value / yMax) * CHART_HEIGHT)
  }

  function handleTooltip(event, month) {
    const wrapper = wrapperRef.current
    const rect = wrapper?.getBoundingClientRect()

    if (!wrapper || !rect) {
      return
    }

    const usagesDetails = getVisibleMonthUsages(month, visibleUsageIds)
      .filter(item => item.volume > 0)
    const total = usagesDetails.reduce((sum, item) => sum + item.volume, 0)
    const tooltipWidth = 360
    const tooltipHeight = 220
    const rawLeft = event.clientX - rect.left + wrapper.scrollLeft + 14
    const rawTop = event.clientY - rect.top + 14
    const maxLeft = wrapper.scrollLeft + rect.width - tooltipWidth - 8
    const maxTop = rect.height - tooltipHeight - 8

    setTooltip({
      left: Math.max(wrapper.scrollLeft + 8, Math.min(rawLeft, maxLeft)),
      top: Math.max(8, Math.min(rawTop, maxTop)),
      month,
      total,
      usages: usagesDetails.map(item => ({
        ...item,
        percentage: total > 0 ? item.volume / total * 100 : 0
      }))
    })
  }

  return (
    <section className='mt-6 border border-gray-200 bg-white p-5 md:p-6'>
      <div className='mb-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <h2 className='fr-h3 fr-mb-1v'>{chart?.title}</h2>
          <p className='fr-text--xs fr-mb-0 max-w-[560px] text-gray-600'>
            {subtitle}
          </p>
        </div>

        <div className='grid w-full gap-3 sm:grid-cols-[120px_minmax(220px,1fr)] md:w-[420px]'>
          <div className='fr-select-group mb-0'>
            <label className='fr-label' htmlFor={`${chart?.key}-year`}>
              Année
            </label>
            <select
              className='fr-select cursor-pointer disabled:cursor-not-allowed'
              disabled={isLoading || yearOptions.length === 0}
              id={`${chart?.key}-year`}
              value={selectedYear ?? ''}
              onChange={event => onYearChange(Number(event.target.value))}
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <WaterBodyTypesMultiselect
            disabled={isLoading}
            id={`${chart?.key}-water-body-types`}
            options={waterBodyTypeOptions}
            value={selectedWaterBodyTypes}
            onChange={onWaterBodyTypesChange}
          />
        </div>
      </div>

      {usages.length > 0 && (
        <div className='mb-3 flex flex-wrap gap-x-4 gap-y-2'>
          {usages.map(item => {
            const usageId = getUsageId(item.usage)
            const isVisible = visibleUsageIds.has(usageId)

            return (
              <button
                key={usageId}
                aria-pressed={isVisible}
                className={`inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-xs ${isVisible ? 'text-gray-700' : 'text-gray-400'}`}
                type='button'
                style={{cursor: 'pointer'}}
                onClick={() => toggleUsage(usageId)}
              >
                <span
                  aria-hidden='true'
                  className='block h-3 w-3 rounded-full'
                  style={{
                    backgroundColor: getUsageColor(item.usage),
                    opacity: isVisible ? 1 : 0.35
                  }}
                />
                <span>{getUsageLabel(item.usage)}</span>
              </button>
            )
          })}
        </div>
      )}

      <div ref={wrapperRef} className='relative overflow-x-auto'>
        {hasData ? (
          <svg
            aria-label={chart?.title}
            className='min-w-[760px] overflow-visible'
            role='img'
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          >
            {yTicks.map(tick => {
              const y = yScale(tick)

              return (
                <g key={tick}>
                  <line
                    stroke='#e5e7eb'
                    strokeDasharray='4 5'
                    strokeWidth='1'
                    x1={MARGIN.left}
                    x2={SVG_WIDTH - MARGIN.right}
                    y1={y}
                    y2={y}
                  />
                  <text
                    fill='#6b7280'
                    fontSize='12'
                    textAnchor='end'
                    x={MARGIN.left - 10}
                    y={y + 4}
                  >
                    {tick === 0 ? '0' : formatCompactVolume(tick)}
                  </text>
                </g>
              )
            })}

            <text
              fill='#4b5563'
              fontSize='12'
              textAnchor='middle'
              transform={`rotate(-90 ${18} ${MARGIN.top + (CHART_HEIGHT / 2)})`}
              x='18'
              y={MARGIN.top + (CHART_HEIGHT / 2)}
            >
              Volume ({chart?.unit ?? 'm³'})
            </text>

            {months.map((month, index) => {
              const x = MARGIN.left + (index * barSlotWidth) + ((barSlotWidth - barWidth) / 2)
              let stackedValue = 0
              const total = getVisibleMonthTotal(month, visibleUsageIds)
              const monthUsages = getVisibleMonthUsages(month, visibleUsageIds)

              return (
                <g
                  key={month.monthKey}
                  onMouseLeave={() => setTooltip(null)}
                  onMouseMove={event => handleTooltip(event, month)}
                >
                  <rect
                    fill='transparent'
                    height={CHART_HEIGHT + 34}
                    style={{cursor: 'crosshair'}}
                    width={barSlotWidth}
                    x={MARGIN.left + (index * barSlotWidth)}
                    y={MARGIN.top - 20}
                  />

                  {monthUsages.map(item => {
                    const y = yScale(stackedValue + item.volume)
                    const height = yScale(stackedValue) - y
                    stackedValue += item.volume

                    if (height <= 0) {
                      return null
                    }

                    return (
                      <rect
                        key={getUsageId(item.usage)}
                        fill={getUsageColor(item.usage)}
                        height={height}
                        width={barWidth}
                        x={x}
                        y={y}
                      />
                    )
                  })}

                  {total > 0 && (
                    <text
                      fill='#4b5563'
                      fontSize='12'
                      fontWeight='600'
                      textAnchor='middle'
                      x={x + (barWidth / 2)}
                      y={Math.max(12, yScale(total) - 7)}
                    >
                      {formatCompactVolume(total)}
                    </text>
                  )}

                  <text
                    fill='#4b5563'
                    fontSize='12'
                    textAnchor='middle'
                    x={x + (barWidth / 2)}
                    y={SVG_HEIGHT - 16}
                  >
                    {month.shortLabel}
                  </text>
                </g>
              )
            })}
          </svg>
        ) : (
          <div className='flex min-h-[300px] items-center justify-center bg-gray-100 text-sm text-gray-600'>
            Aucun volume disponible pour les filtres sélectionnés.
          </div>
        )}

        {tooltip && (
          <div
            className='pointer-events-none absolute z-20 min-w-[280px] max-w-[360px] rounded bg-gray-900 p-3 text-xs text-white shadow-lg'
            style={{
              left: tooltip.left,
              top: tooltip.top
            }}
          >
            <p className='fr-mb-2v border-b border-gray-700 pb-2 font-semibold'>
              {tooltip.month.label}
            </p>

            {tooltip.usages.length > 0 ? (
              <div className='flex flex-col gap-1.5'>
                {tooltip.usages.map(item => (
                  <div key={getUsageId(item.usage)} className='grid grid-cols-[1fr_auto_auto] items-center gap-3'>
                    <span className='flex min-w-0 items-center gap-2'>
                      <span
                        aria-hidden='true'
                        className='block h-2.5 w-2.5 shrink-0 rounded-full'
                        style={{backgroundColor: getUsageColor(item.usage)}}
                      />
                      <span className='truncate'>{getUsageLabel(item.usage)}</span>
                    </span>
                    <span className='tabular-nums'>{formatExactVolume(item.volume)}</span>
                    <span className='tabular-nums text-gray-300'>{formatPercentage(item.percentage)}</span>
                  </div>
                ))}
                <div className='mt-2 grid grid-cols-[1fr_auto_auto] gap-3 border-t border-gray-700 pt-2 font-semibold'>
                  <span>Total</span>
                  <span className='tabular-nums'>{formatExactVolume(tooltip.total)}</span>
                  <span className='tabular-nums text-gray-300'>100 %</span>
                </div>
              </div>
            ) : (
              <p className='fr-mb-0 text-gray-300'>
                Aucun volume visible pour ce mois.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default DashboardVolumesChart
