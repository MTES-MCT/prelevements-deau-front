'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import Alert from '@codegouvfr/react-dsfr/Alert'
import {Badge} from '@codegouvfr/react-dsfr/Badge'
import Button from '@codegouvfr/react-dsfr/Button'
import Input from '@codegouvfr/react-dsfr/Input'

import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {
  createDataExportAction,
  deleteDataExportAction,
  getDataExportDownloadAction,
  listDataExportsAction
} from '@/server/actions/exports.js'

const REFRESH_INTERVAL_MS = 4000

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
    String(a.content || '').localeCompare(String(b.content || ''), 'fr', {
      sensitivity: 'base'
    })
  )
}

function buildUsageOptions(usages = []) {
  const roots = usages.filter(usage => usage.kind === 'USAGE')
  const childrenByParent = new Map()

  for (const usage of usages.filter(item => item.kind === 'SUB_USAGE')) {
    const children = childrenByParent.get(usage.parentId) ?? []
    children.push(usage)
    childrenByParent.set(usage.parentId, children)
  }

  const groups = [
    {
      label: 'Usages principaux',
      options: sortOptions(roots.map(usage => ({
        value: usage.id,
        content: usage.label,
        title: `${usage.label}${usage.code ? ` (${usage.code})` : ''}`
      })))
    }
  ]

  for (const root of sortOptions(roots.map(usage => ({
    ...usage,
    content: usage.label
  })))) {
    const children = childrenByParent.get(root.id) ?? []
    if (children.length === 0) {
      continue
    }

    groups.push({
      label: `Sous-usages - ${root.label}`,
      options: sortOptions(children.map(usage => ({
        value: usage.id,
        content: usage.label,
        title: `${usage.label}${usage.code ? ` (${usage.code})` : ''}`
      })))
    })
  }

  return groups
}

function buildZoneOptions(zones = []) {
  return [
    {
      label: 'Zones',
      options: sortOptions(zones.map(zone => ({
        value: zone.id,
        content: zone.label || zone.name,
        title: zone.label || zone.name
      })))
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
      labels.set(option.value, option.content || option.title || option.value)
    }
  }

  return labels
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
    return `${exportItem.rowCount ?? 0} ligne${exportItem.rowCount > 1 ? 's' : ''}`
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

        <div className='flex flex-wrap gap-2'>
          {item.status === 'COMPLETED' && (
            <Button
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
  const [success, setSuccess] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const todayDate = useMemo(() => formatDateInput(new Date()), [])
  const periodPresets = useMemo(() => buildPeriodPresets(new Date()), [])
  const usageOptions = useMemo(() => buildUsageOptions(options.usages), [options.usages])
  const zoneOptions = useMemo(() => buildZoneOptions(options.zones), [options.zones])
  const waterBodyTypeOptions = useMemo(
    () => buildWaterBodyTypeOptions(options.waterBodyTypes),
    [options.waterBodyTypes]
  )
  const optionLabelMaps = useMemo(() => ({
    usage: buildOptionLabelMap(usageOptions),
    zone: buildOptionLabelMap(zoneOptions),
    waterBodyType: buildOptionLabelMap(waterBodyTypeOptions)
  }), [usageOptions, zoneOptions, waterBodyTypeOptions])
  const hasRunningExport = exports.some(item => ['PENDING', 'PROCESSING'].includes(item.status))

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
    setSuccess(null)
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

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
        setSuccess('Export demandé. Le fichier sera disponible dans l’historique dès la fin du traitement.')
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
        window.open(result.data.downloadUrl, '_blank', 'noopener,noreferrer')
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
    setSuccess(null)

    try {
      const result = await deleteDataExportAction(item.id)

      if (result.success) {
        setExports(currentExports => currentExports.filter(exportItem => exportItem.id !== item.id))
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

          {success && (
            <Alert
              small
              severity='success'
              description={success}
            />
          )}

          <div>
            <h2 className='fr-h5 fr-mb-1w'>
              Période à exporter
            </h2>
            <p className='fr-text--sm fr-mb-0 text-gray-700'>
              Les champs marqués d’un astérisque sont obligatoires. La période ne peut pas inclure de date future.
              Les volumes sont sélectionnés par chevauchement de période, les index par date de mesure.
            </p>
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

          <div className='flex flex-col gap-4 border-t border-gray-200 pt-4'>
            <div>
              <h2 className='fr-h5 fr-mb-1w'>
                Affiner l’export
              </h2>
              <p className='fr-text--sm fr-mb-0 text-gray-700'>
                Ces filtres sont optionnels. Sans sélection, l’export conserve tout le périmètre auquel vous avez accès.
              </p>
            </div>

            <GroupedMultiselect
              searchable
              label='Usages'
              placeholder='Tous les usages'
              options={usageOptions}
              value={selectedUsageIds}
              onChange={setSelectedUsageIds}
            />

            <GroupedMultiselect
              searchable
              label='Zones'
              placeholder='Toutes les zones accessibles'
              options={zoneOptions}
              value={selectedZoneIds}
              onChange={setSelectedZoneIds}
            />

            <GroupedMultiselect
              searchable
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
    </div>
  )
}

export default ExportForm
