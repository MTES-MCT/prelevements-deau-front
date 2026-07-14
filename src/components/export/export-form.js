'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import Alert from '@codegouvfr/react-dsfr/Alert'
import {Badge} from '@codegouvfr/react-dsfr/Badge'
import Button from '@codegouvfr/react-dsfr/Button'
import Input from '@codegouvfr/react-dsfr/Input'

import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import {
  createDataExportAction,
  deleteDataExportAction,
  getDataExportDownloadAction,
  listDataExportsAction
} from '@/server/actions/exports.js'

const REFRESH_INTERVAL_MS = 4000

const zoneTypePresentations = {
  REGION: {
    className: 'border-[#000091] bg-[#eeeeff] text-[#000091]',
    iconClassName: ZONE_ICONS.mapPin2,
    label: 'Région'
  },
  DEPARTEMENT: {
    className: 'border-[#18753c] bg-[#e6f4ea] text-[#18753c]',
    iconClassName: ZONE_ICONS.mapPin,
    label: 'Département'
  },
  SAGE: {
    className: 'border-[#8d533e] bg-[#fff4f0] text-[#8d533e]',
    iconClassName: ZONE_ICONS.water,
    label: 'SAGE'
  }
}

const statusConfig = {
  PENDING: {
    label: 'En attente',
    severity: 'info'
  },
  PROCESSING: {
    label: 'En cours',
    severity: 'info'
  },
  COMPLETED: {
    label: 'Disponible',
    severity: 'success'
  },
  FAILED: {
    label: 'Échec',
    severity: 'error'
  }
}

function padDatePart(value) {
  return String(value).padStart(2, '0')
}

function formatDateInput(date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate())
  ].join('-')
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)

  return result
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate())
}

function buildPeriodPresets(today) {
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

  return [
    {
      label: 'Mois en cours',
      startDate: formatDateInput(startOfMonth(today)),
      endDate: formatDateInput(today)
    },
    {
      label: '30 derniers jours',
      startDate: formatDateInput(addDays(today, -29)),
      endDate: formatDateInput(today)
    },
    {
      label: 'Mois précédent',
      startDate: formatDateInput(previousMonthStart),
      endDate: formatDateInput(previousMonthEnd)
    },
    {
      label: '3 derniers mois',
      startDate: formatDateInput(addMonths(today, -3)),
      endDate: formatDateInput(today)
    },
    {
      label: 'Année en cours',
      startDate: `${today.getFullYear()}-01-01`,
      endDate: formatDateInput(today)
    }
  ]
}

function sortOptions(options) {
  return [...options].sort((a, b) =>
    String(a.sortLabel || a.content || '').localeCompare(String(b.sortLabel || b.content || ''), 'fr', {
      sensitivity: 'base'
    })
  )
}

function buildUsageOptions(usages = []) {
  const roots = usages.filter(usage => usage.kind === 'USAGE')

  return [
    {
      label: 'Usages principaux',
      options: sortOptions(roots.map(usage => ({
        value: usage.id,
        content: usage.label,
        title: `${usage.label}${usage.code ? ` (${usage.code})` : ''}`
      })))
    }
  ]
}

function buildZoneOptions(zones = []) {
  return [
    {
      label: 'Zones',
      options: sortOptions(zones.map(zone => {
        const presentation = zoneTypePresentations[zone.type] ?? {
          className: 'border-gray-300 bg-gray-100 text-gray-700',
          iconClassName: ZONE_ICONS.mapPin2,
          label: zone.type
        }

        return {
          value: zone.id,
          label: zone.label || zone.name,
          sortLabel: zone.name,
          title: zone.label || zone.name,
          content: (
            <span className='flex min-w-0 flex-1 items-center justify-between gap-2'>
              <span className='truncate'>{zone.name}</span>
              <span className={`inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 text-xs font-medium ${presentation.className}`}>
                <span
                  className={`${presentation.iconClassName} [&::after]:![--icon-size:0.72rem] [&::before]:![--icon-size:0.72rem]`}
                  aria-hidden='true'
                />
                {presentation.label}
              </span>
            </span>
          )
        }
      }))
    }
  ]
}

function buildWaterBodyTypeOptions(waterBodyTypes = []) {
  return [
    {
      label: 'Types de milieu',
      options: sortOptions(waterBodyTypes.map(waterBodyType => ({
        value: waterBodyType.value,
        content: waterBodyType.label,
        title: waterBodyType.label
      })))
    }
  ]
}

function buildOptionLabelMap(groups = []) {
  const labels = new Map()

  for (const group of groups) {
    for (const option of group.options || []) {
      labels.set(option.value, option.label || option.content || option.title || option.value)
    }
  }

  return labels
}

function buildUsageLabelMap(usages = []) {
  return new Map(usages.map(usage => [usage.id, usage.label]))
}

function formatDateTime(value) {
  if (!value) {
    return 'Non renseigné'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}

function formatDateRange(filters = {}) {
  if (!filters.startDate && !filters.endDate) {
    return 'Période non renseignée'
  }

  if (filters.startDate && filters.endDate) {
    return `${filters.startDate} - ${filters.endDate}`
  }

  return filters.startDate ? `Depuis ${filters.startDate}` : `Jusqu’au ${filters.endDate}`
}

function formatExportCount(exportItem) {
  if (exportItem.status === 'COMPLETED') {
    const rowCount = exportItem.rowCount ?? 0
    return `${rowCount} ligne${rowCount === 1 ? '' : 's'}`
  }

  return 'Nombre de lignes à venir'
}

function getArrayFilter(filters, key) {
  return Array.isArray(filters?.[key]) ? filters[key] : []
}

function formatSelectedFilterValues(values, labelMap) {
  const labels = values.map(value => labelMap.get(value) || value)
  const visibleLabels = labels.slice(0, 2)
  const hiddenCount = Math.max(0, labels.length - visibleLabels.length)

  if (hiddenCount === 0) {
    return visibleLabels.join(', ')
  }

  return `${visibleLabels.join(', ')} + ${hiddenCount}`
}

function buildExportFilterSummary(item, optionLabelMaps) {
  const usageIds = getArrayFilter(item.filters, 'usageIds')
  const zoneIds = getArrayFilter(item.filters, 'zoneIds')
  const waterBodyTypes = getArrayFilter(item.filters, 'waterBodyTypes')

  return [
    {
      label: 'Usages',
      value: usageIds.length > 0
        ? formatSelectedFilterValues(usageIds, optionLabelMaps.usage)
        : 'Tous'
    },
    {
      label: 'Zones',
      value: zoneIds.length > 0
        ? formatSelectedFilterValues(zoneIds, optionLabelMaps.zone)
        : 'Toutes accessibles'
    },
    {
      label: 'Milieux',
      value: waterBodyTypes.length > 0
        ? formatSelectedFilterValues(waterBodyTypes, optionLabelMaps.waterBodyType)
        : 'Tous'
    }
  ]
}

const ExportStatusBadge = ({status}) => {
  const config = statusConfig[status] ?? {
    label: status,
    severity: 'info'
  }

  return (
    <Badge noIcon small severity={config.severity}>
      {config.label}
    </Badge>
  )
}

const ExportGenerationFeedback = ({
  items,
  downloadingId,
  onCloseAll,
  onDismiss,
  onDownload
}) => {
  if (items.length === 0) {
    return null
  }

  const runningCount = items.filter(item => ['PENDING', 'PROCESSING'].includes(item.status)).length

  return (
    <aside
      className='fixed bottom-4 left-4 right-4 z-[1000] border border-gray-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] sm:left-auto sm:w-[26rem]'
      aria-atomic='true'
      aria-live='polite'
      role='status'
    >
      <div className='flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3'>
        <div>
          <p className='fr-mb-0 font-semibold text-gray-900'>Suivi des exports</p>
          <p className='fr-text--xs fr-mb-0 text-gray-600'>
            {runningCount > 0
              ? `${runningCount} fichier${runningCount > 1 ? 's' : ''} en préparation`
              : 'Tous les traitements sont terminés'}
          </p>
        </div>

        <button
          type='button'
          className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line fr-btn--icon-left shrink-0'
          aria-label='Masquer le suivi des exports'
          onClick={onCloseAll}
        />
      </div>

      <div className='max-h-[min(60vh,28rem)] overflow-y-auto'>
        {items.map(item => {
          const isRunning = ['PENDING', 'PROCESSING'].includes(item.status)
          const isCompleted = item.status === 'COMPLETED'
          let title = 'Échec de la génération'
          let description = item.errorMessage || 'Le fichier n’a pas pu être généré.'
          let iconClassName = 'fr-icon-error-warning-line text-[#ce0500]'

          if (isRunning) {
            title = item.status === 'PENDING' ? 'Export en attente' : 'Génération en cours'
            description = 'Le fichier est en cours de préparation.'
          } else if (isCompleted) {
            title = 'Export prêt'
            description = `${formatExportCount(item)} disponible${item.rowCount === 1 ? '' : 's'}.`
            iconClassName = 'fr-icon-check-line text-[#18753c]'
          }

          return (
            <div key={item.id} className='flex items-start gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0'>
              {isRunning ? (
                <span
                  className='mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#000091] border-t-transparent'
                  aria-hidden='true'
                />
              ) : (
                <span
                  className={`${iconClassName} mt-0.5 shrink-0 [&::after]:![--icon-size:1.25rem] [&::before]:![--icon-size:1.25rem]`}
                  aria-hidden='true'
                />
              )}

              <div className='min-w-0 flex-1'>
                <p className='fr-text--sm fr-mb-0 font-semibold text-gray-900'>{title}</p>
                <p className='fr-text--xs fr-mb-0 text-gray-700'>{description}</p>
                <p className='fr-text--xs fr-mb-0 text-gray-600'>{formatDateRange(item.filters)}</p>

                {isCompleted && (
                  <div className='mt-2'>
                    <Button
                      size='small'
                      disabled={downloadingId === item.id}
                      onClick={() => onDownload(item)}
                    >
                      {downloadingId === item.id ? 'Téléchargement...' : 'Télécharger'}
                    </Button>
                  </div>
                )}
              </div>

              <button
                type='button'
                className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line fr-btn--icon-left shrink-0'
                aria-label={`Masquer le suivi de l’export ${formatDateRange(item.filters)}`}
                onClick={() => onDismiss(item.id)}
              />
            </div>
          )
        })}
      </div>
    </aside>
  )
}

const ExportHistoryItem = ({
  item,
  optionLabelMaps,
  onDelete,
  onDownload,
  deleting,
  downloading
}) => {
  const filterSummary = buildExportFilterSummary(item, optionLabelMaps)

  return (
    <div className='border border-gray-200 bg-white p-3 md:p-4'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div className='flex flex-col gap-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='fr-mb-0 text-base font-bold text-gray-900'>
              {item.fileName || 'Export de données'}
            </h3>
            <ExportStatusBadge status={item.status} />
          </div>

          <p className='fr-text--sm fr-mb-0 text-gray-700'>
            {formatDateRange(item.filters)} · {formatExportCount(item)}
          </p>

          <div className='flex flex-wrap gap-2'>
            {filterSummary.map(filter => (
              <span
                key={filter.label}
                className='inline-flex max-w-full items-center gap-1 bg-gray-100 px-2 py-1 text-xs text-gray-700'
              >
                <span className='font-medium text-gray-900'>{filter.label}</span>
                <span className='truncate'>{filter.value}</span>
              </span>
            ))}
          </div>

          <p className='fr-text--xs fr-mb-0 text-gray-600'>
            Demandé le {formatDateTime(item.createdAt)}
          </p>
        </div>

        <div className='flex shrink-0 flex-wrap gap-2'>
          {item.status === 'COMPLETED' && (
            <Button
              className='whitespace-nowrap'
              size='small'
              priority='secondary'
              disabled={downloading || deleting}
              onClick={() => onDownload(item)}
            >
              Télécharger
            </Button>
          )}

          {!['PENDING', 'PROCESSING'].includes(item.status) && (
            <Button
              className='whitespace-nowrap'
              size='small'
              priority='tertiary no outline'
              disabled={downloading || deleting}
              onClick={() => onDelete(item)}
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          )}
        </div>
      </div>

      {item.status === 'FAILED' && item.errorMessage && (
        <div className='mt-3'>
          <Alert small severity='error' description={item.errorMessage} />
        </div>
      )}
    </div>
  )
}

const ExportForm = ({
  options = {},
  initialExports = []
}) => {
  const [exports, setExports] = useState(initialExports)
  const [selectedUsageIds, setSelectedUsageIds] = useState([])
  const [selectedZoneIds, setSelectedZoneIds] = useState([])
  const [selectedWaterBodyTypes, setSelectedWaterBodyTypes] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState(null)
  const [historyError, setHistoryError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [feedbackExportIds, setFeedbackExportIds] = useState(() =>
    initialExports
      .filter(item => ['PENDING', 'PROCESSING'].includes(item.status))
      .map(item => item.id))

  const todayDate = useMemo(() => formatDateInput(new Date()), [])
  const periodPresets = useMemo(() => buildPeriodPresets(new Date()), [])
  const usageOptions = useMemo(() => buildUsageOptions(options.usages), [options.usages])
  const zoneOptions = useMemo(() => buildZoneOptions(options.zones), [options.zones])
  const waterBodyTypeOptions = useMemo(
    () => buildWaterBodyTypeOptions(options.waterBodyTypes),
    [options.waterBodyTypes]
  )
  const optionLabelMaps = useMemo(() => ({
    usage: buildUsageLabelMap(options.usages),
    zone: buildOptionLabelMap(zoneOptions),
    waterBodyType: buildOptionLabelMap(waterBodyTypeOptions)
  }), [options.usages, zoneOptions, waterBodyTypeOptions])
  const hasRunningExport = exports.some(item => ['PENDING', 'PROCESSING'].includes(item.status))
  const feedbackExports = feedbackExportIds
    .map(exportId => exports.find(item => item.id === exportId))
    .filter(Boolean)

  const refreshExports = useCallback(async () => {
    const result = await listDataExportsAction()
    if (result.success) {
      setExports(result.data?.items ?? [])
      setHistoryError(null)
    } else {
      setHistoryError(result.error || 'Impossible de mettre à jour l’historique des exports.')
    }
  }, [])

  useEffect(() => {
    if (!hasRunningExport) {
      return undefined
    }

    const interval = setInterval(() => {
      refreshExports()
    }, REFRESH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [hasRunningExport, refreshExports])

  const applyPeriodPreset = preset => {
    setStartDate(preset.startDate)
    setEndDate(preset.endDate)
    setError(null)
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError(null)

    if (!startDate || !endDate) {
      setError('Sélectionnez une date de début et une date de fin.')
      return
    }

    if (startDate > endDate) {
      setError('La date de début doit être antérieure ou égale à la date de fin.')
      return
    }

    if (startDate > todayDate || endDate > todayDate) {
      setError('La période exportée ne peut pas inclure de date future.')
      return
    }

    setSubmitting(true)
    try {
      const result = await createDataExportAction({
        startDate,
        endDate,
        usageIds: selectedUsageIds,
        zoneIds: selectedZoneIds,
        waterBodyTypes: selectedWaterBodyTypes
      })

      if (result.success) {
        setFeedbackExportIds(currentIds => [
          result.data.id,
          ...currentIds.filter(exportId => exportId !== result.data.id)
        ])
        setExports(currentExports => [
          result.data,
          ...currentExports.filter(item => item.id !== result.data.id)
        ])
        await refreshExports()
      } else {
        setError(result.error || 'Impossible de créer l’export.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = async item => {
    setDownloadingId(item.id)
    setError(null)
    setHistoryError(null)

    try {
      const result = await getDataExportDownloadAction(item.id)

      if (result.success && result.data?.downloadUrl) {
        const downloadLink = document.createElement('a')
        downloadLink.href = result.data.downloadUrl
        downloadLink.rel = 'noopener noreferrer'
        document.body.append(downloadLink)
        downloadLink.click()
        downloadLink.remove()
      } else {
        setHistoryError(result.error || 'Impossible de télécharger cet export.')
      }
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async item => {
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      `Supprimer l’export « ${item.fileName || 'Export de données'} » ?\n\nLe fichier ne sera plus disponible au téléchargement.`
    )

    if (!confirmed) {
      return
    }

    setDeletingId(item.id)
    setError(null)
    setHistoryError(null)

    try {
      const result = await deleteDataExportAction(item.id)

      if (result.success) {
        setExports(currentExports => currentExports.filter(exportItem => exportItem.id !== item.id))
        setFeedbackExportIds(currentIds => currentIds.filter(exportId => exportId !== item.id))
      } else {
        await refreshExports()
        setHistoryError(result.error || 'Impossible de supprimer cet export.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className='flex flex-col gap-8'>
      <section className='border border-gray-200 bg-white p-4 md:p-5'>
        <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
          {error && (
            <Alert
              small
              severity='error'
              description={error}
            />
          )}

          <div>
            <h2 className='fr-h5 fr-mb-1w'>
              Paramètres de l’export
            </h2>
            <p className='fr-text--sm fr-mb-0 text-gray-700'>
              Le volume est toujours indiqué. L’index l’est aussi lorsqu’il a été déclaré : certaines déclarations portent uniquement sur le volume, la colonne index est alors vide. La génération du fichier peut prendre quelques minutes selon la période et le nombre de points concernés. Une fois prêt, il est disponible dans l’historique en bas de cette page.
            </p>
          </div>

          <div className='flex flex-col gap-2'>
            <p className='fr-text--sm fr-mb-0 font-medium text-gray-700'>
              Périodes prédéfinies
            </p>

            <div className='flex flex-wrap gap-2'>
              {periodPresets.map(preset => (
                <button
                  key={preset.label}
                  type='button'
                  className='fr-tag'
                  onClick={() => applyPeriodPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <Input
              label='Date de début *'
              nativeInputProps={{
                max: todayDate,
                type: 'date',
                value: startDate,
                required: true,
                onChange: event => setStartDate(event.target.value)
              }}
            />

            <Input
              label='Date de fin *'
              nativeInputProps={{
                max: todayDate,
                type: 'date',
                value: endDate,
                required: true,
                onChange: event => setEndDate(event.target.value)
              }}
            />
          </div>

          <div className='flex flex-col gap-4 border-t border-gray-200 pt-4'>
            <div>
              <h2 className='fr-h5 fr-mb-1w'>
                Paramètres optionnels
              </h2>
              <p className='fr-text--sm fr-mb-0 text-gray-700'>
                Par défaut, le fichier d’export contiendra toutes les options possibles ci-dessous.
              </p>
            </div>

            <GroupedMultiselect
              label='Usages'
              placeholder='Tous les usages'
              options={usageOptions}
              value={selectedUsageIds}
              onChange={setSelectedUsageIds}
            />

            <GroupedMultiselect
              label='Zones'
              placeholder='Toutes les zones accessibles'
              options={zoneOptions}
              value={selectedZoneIds}
              onChange={setSelectedZoneIds}
            />

            <GroupedMultiselect
              label='Types de milieu'
              placeholder='Tous les types de milieu'
              options={waterBodyTypeOptions}
              value={selectedWaterBodyTypes}
              onChange={setSelectedWaterBodyTypes}
            />
          </div>

          <div>
            <Button type='submit' disabled={submitting}>
              {submitting ? 'Demande en cours...' : 'Créer l’export'}
            </Button>
          </div>
        </form>
      </section>

      <section className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='fr-h4 fr-mb-0'>
            Historique des exports
          </h2>
          {hasRunningExport && (
            <span className='fr-text--sm fr-mb-0 text-gray-600'>
              Mise à jour automatique en cours
            </span>
          )}
        </div>

        {historyError && (
          <Alert
            small
            severity='error'
            description={historyError}
          />
        )}

        {exports.length === 0 ? (
          <div className='border border-gray-200 bg-white p-5 md:p-6'>
            <Alert
              small
              severity='info'
              description='Aucun export demandé pour le moment.'
            />
          </div>
        ) : (
          <div className='flex flex-col gap-3'>
            {exports.map(item => (
              <ExportHistoryItem
                key={item.id}
                item={item}
                optionLabelMaps={optionLabelMaps}
                deleting={deletingId === item.id}
                downloading={downloadingId === item.id}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </section>

      <ExportGenerationFeedback
        items={feedbackExports}
        downloadingId={downloadingId}
        onCloseAll={() => setFeedbackExportIds([])}
        onDismiss={exportId => setFeedbackExportIds(currentIds =>
          currentIds.filter(currentId => currentId !== exportId))}
        onDownload={handleDownload}
      />
    </div>
  )
}

export default ExportForm
