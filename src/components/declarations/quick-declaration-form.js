'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'
import Link from 'next/link'
import {createPortal} from 'react-dom'

import QuickDeclarationMap from './quick-declaration-map.js'

import {useAuth} from '@/contexts/auth-context.js'
import {getDeclarantTitleFromUser} from '@/lib/declarants.js'
import {
  buildPointDisplayNames,
  buildPointUsageNameChanges,
  getPointDisplayName,
  getPointTechnicalName,
  getPointUsageNameDraft,
  MAX_POINT_USAGE_NAME_LENGTH
} from '@/lib/quick-declaration-point-name.js'
import {
  getMyDeclarationSubmissionSuccessURL,
  getMyDeclarationURL
} from '@/lib/urls.js'
import {normalizeUsageOption} from '@/lib/water-uses.js'
import {
  createQuickDeclarationAction,
  getQuickDeclarationContextAction,
  previewQuickDeclarationConflictsAction
} from '@/server/actions/declarations.js'
import {formatNumber} from '@/utils/number.js'

const POINTS_CONTACT_EMAIL = 'contact@partageonsleau.beta.gouv.fr'
const POINTS_CONTACT_SUBJECT_SUFFIX = 'Modification sur mes points de prélèvements'
const ENTRY_GRID_COLUMNS_CLASS_NAME = 'md:grid-cols-[minmax(190px,1fr)_96px_minmax(170px,220px)]'
const MOBILE_USAGE_DROPDOWN_MEDIA_QUERY = '(max-width: 47.999rem)'

const QUICK_DECLARATION_MEASUREMENT_TYPES = Object.freeze({
  INDEX: 'INDEX',
  VOLUME_PRELEVE: 'VOLUME_PRELEVE',
  VOLUME_REJETE: 'VOLUME_REJETE'
})

const QUICK_DECLARATION_MEASUREMENT_SEGMENTS = [
  {
    value: QUICK_DECLARATION_MEASUREMENT_TYPES.INDEX,
    label: 'Relevé d’index',
    iconId: 'fr-icon-edit-line'
  },
  {
    value: QUICK_DECLARATION_MEASUREMENT_TYPES.VOLUME_PRELEVE,
    label: 'Volume prélevé',
    iconId: 'fr-icon-arrow-up-line'
  },
  {
    value: QUICK_DECLARATION_MEASUREMENT_TYPES.VOLUME_REJETE,
    label: 'Volume rejeté',
    iconId: 'fr-icon-arrow-down-line'
  }
]

const DATE_RANGE_WEEKDAYS = [
  {key: 'monday', label: 'L'},
  {key: 'tuesday', label: 'M'},
  {key: 'wednesday', label: 'M'},
  {key: 'thursday', label: 'J'},
  {key: 'friday', label: 'V'},
  {key: 'saturday', label: 'S'},
  {key: 'sunday', label: 'D'}
]

function getPreleveurId(preleveur) {
  return preleveur.id || preleveur.userId || preleveur.declarant?.userId
}

function getPointId(point) {
  return point.pointPrelevementId || point.id
}

function getDeclarantContactName(declarant) {
  const firstName = declarant?.firstName ?? declarant?.user?.firstName
  const lastName = declarant?.lastName ?? declarant?.user?.lastName

  if (firstName || lastName) {
    return [lastName, firstName].filter(Boolean).join(' / ')
  }

  const title = getDeclarantTitleFromUser(declarant)
  return declarant?.socialReason || declarant?.declarant?.socialReason || (title === 'Non renseigné' ? '' : title)
}

function buildPointsContactMailto(declarantName) {
  const subject = `[${declarantName || 'Nom / prénom du déclarant'}] ${POINTS_CONTACT_SUBJECT_SUFFIX}`
  return `mailto:${POINTS_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
}

function normalizePointId(pointId) {
  if (pointId === null || pointId === undefined) {
    return null
  }

  return String(pointId)
}

function isPointIdEqual(pointId, otherPointId) {
  return normalizePointId(pointId) === normalizePointId(otherPointId)
}

function todayISO() {
  const today = new Date()
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
  return today.toISOString().slice(0, 10)
}

function isFutureDate(value, maxDate) {
  return Boolean(value && maxDate && value > maxDate)
}

function formatDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('fr-FR').format(date)
}

function parseDateInput(value) {
  if (!value) {
    return null
  }

  const [year, month, day] = String(value).split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  const date = new Date(year, month - 1, day)

  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null
  }

  return date
}

function toDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function isSameDate(left, right) {
  return left && right && toDateInputValue(left) === toDateInputValue(right)
}

function isDateInRange(date, start, end) {
  if (!date || !start || !end) {
    return false
  }

  const time = date.getTime()
  return time >= start.getTime() && time <= end.getTime()
}

function clampDateToMax(date, maxDate) {
  const max = parseDateInput(maxDate)
  return max && date > max ? max : date
}

function getMonthLabel(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric'
  }).format(date)
}

function getDateRangeLabel(startDate, endDate) {
  const startLabel = formatDate(startDate)
  const endLabel = formatDate(endDate)

  if (startLabel && endLabel) {
    return `Du ${startLabel} au ${endLabel}`
  }

  if (startLabel) {
    return `Début : ${startLabel}`
  }

  if (endLabel) {
    return `Fin : ${endLabel}`
  }

  return 'Sélectionner une période'
}

function buildCalendarDays(monthDate) {
  const monthStart = startOfMonth(monthDate)
  const offset = (monthStart.getDay() + 6) % 7
  const firstDay = new Date(monthStart)
  firstDay.setDate(monthStart.getDate() - offset)

  return Array.from({length: 42}, (_, index) => {
    const day = new Date(firstDay)
    day.setDate(firstDay.getDate() + index)
    return day
  })
}

function buildMonthlyDateRangePresets(maxDate) {
  const today = clampDateToMax(new Date(), maxDate)
  const currentMonthStart = startOfMonth(today)
  const previousMonthStart = addMonths(currentMonthStart, -1)

  return [
    {
      label: 'Mois précédent',
      startDate: toDateInputValue(previousMonthStart),
      endDate: toDateInputValue(endOfMonth(previousMonthStart))
    },
    {
      label: 'Mois en cours',
      startDate: toDateInputValue(currentMonthStart),
      endDate: toDateInputValue(today)
    }
  ]
}

function classNames(...values) {
  return values.filter(Boolean).join(' ')
}

function hasDeclarationHistory(point) {
  const declarationsCount = Number(point.declarationsCount ?? point.declarationCount ?? 0)
  return Boolean(point.lastReading || point.lastDeclaration || declarationsCount > 0)
}

function comparePointsForEntry(pointA, pointB) {
  const historyOrder = Number(hasDeclarationHistory(pointB)) - Number(hasDeclarationHistory(pointA))

  if (historyOrder !== 0) {
    return historyOrder
  }

  return getPointDisplayName(pointA).localeCompare(getPointDisplayName(pointB), 'fr', {sensitivity: 'base'})
}

function normalizeNumberInput(value) {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  const compactValue = String(value)
    .replaceAll(/\s/g, '')
    .replaceAll(',', '.')
    .replaceAll(/[^\d.]/g, '')

  if (!compactValue) {
    return ''
  }

  const hasDecimalSeparator = compactValue.includes('.')
  const [integerPart = '', ...fractionParts] = compactValue.split('.')
  const integer = integerPart.replace(/^0+(?=\d)/, '')
  const fraction = fractionParts.join('')

  if (!hasDecimalSeparator) {
    return integer
  }

  return `${integer || '0'}.${fraction}`
}

function formatNumberInput(value) {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  const normalizedValue = String(value)
  const [integerPart = '0', fractionPart = ''] = normalizedValue.split('.')
  const groupedInteger = (integerPart || '0').replaceAll(/\B(?=(\d{3})+(?!\d))/g, ' ')

  if (!normalizedValue.includes('.')) {
    return groupedInteger
  }

  return `${groupedInteger},${fractionPart}`
}

function countEditableNumberCharacters(value, endIndex) {
  let count = 0

  for (const character of String(value).slice(0, endIndex)) {
    if (/[\d,.]/.test(character)) {
      count += 1
    }
  }

  return count
}

function getFormattedCaretPosition(value, editableCharactersCount) {
  if (editableCharactersCount <= 0) {
    return 0
  }

  let count = 0

  for (const [index, character] of [...value].entries()) {
    if (/[\d,]/.test(character)) {
      count += 1

      if (count >= editableCharactersCount) {
        return index + 1
      }
    }
  }

  return value.length
}

function isCompleteNumberInput(value) {
  return value !== '' && !String(value).endsWith('.')
}

function getDefaultUsage(point) {
  return normalizeUsageOption(point.lastKnownUsage).value
    || normalizeUsageOption(point.usage).value
    || ''
}

function getInitialRow(point) {
  return {
    value: '',
    usageId: getDefaultUsage(point),
    usageName: point.usageName ?? ''
  }
}

function getRowState(rows, pointId) {
  const row = rows[pointId]

  if (!row) {
    return {
      value: '',
      usageId: '',
      usageName: '',
      usageSearch: undefined
    }
  }

  return {
    value: row.value ?? row.index ?? '',
    usageId: row.usageId ?? '',
    usageName: row.usageName ?? '',
    usageSearch: row.usageSearch
  }
}

function isIndexMeasurementType(measurementType) {
  return measurementType === QUICK_DECLARATION_MEASUREMENT_TYPES.INDEX
}

function getMeasurementInputLabel(measurementType) {
  return isIndexMeasurementType(measurementType) ? 'Index (m³)' : 'Volume (m³)'
}

function getMeasurementValueValidationLabel(measurementType) {
  if (measurementType === QUICK_DECLARATION_MEASUREMENT_TYPES.VOLUME_PRELEVE) {
    return 'le volume prélevé'
  }

  if (measurementType === QUICK_DECLARATION_MEASUREMENT_TYPES.VOLUME_REJETE) {
    return 'le volume rejeté'
  }

  return 'l’index'
}

function getMeasurementEntryNoun(measurementType) {
  return isIndexMeasurementType(measurementType) ? 'relevé' : 'volume'
}

function getLastReadingLabel(point) {
  const {lastReading} = point

  if (!lastReading || lastReading.value === null || lastReading.value === undefined) {
    return null
  }

  const date = formatDate(lastReading.date)
  const unit = lastReading.unit || 'm³'

  return `${formatNumber(lastReading.value)} ${unit}${date ? ` au ${date}` : ''}`
}

function getInclusivePeriodEnd(periodStart, periodEnd, frequency) {
  if (!periodEnd) {
    return null
  }

  const end = new Date(periodEnd)

  if (Number.isNaN(end.getTime())) {
    return null
  }

  const start = new Date(periodStart)
  const dateOnlyFrequencies = new Set(['1 day', '1 week', '1 month', '1 quarter', '1 year'])

  if (!Number.isNaN(start.getTime()) && end > start && dateOnlyFrequencies.has(frequency)) {
    end.setUTCDate(end.getUTCDate() - 1)
  }

  return end
}

function getPeriodLabel({frequency, periodEnd, periodStart}) {
  const startLabel = formatDate(periodStart)
  const inclusiveEnd = getInclusivePeriodEnd(periodStart, periodEnd, frequency)
  const endLabel = inclusiveEnd ? formatDate(inclusiveEnd) : null

  if (startLabel && endLabel && startLabel !== endLabel) {
    return `${startLabel} au ${endLabel}`
  }

  return startLabel || endLabel
}

function getLastVolumePeriodLabel(point, measurementType) {
  const lastVolume = measurementType === QUICK_DECLARATION_MEASUREMENT_TYPES.VOLUME_REJETE
    ? point?.lastVolumePeriods?.discharged
    : point?.lastVolumePeriods?.withdrawn

  if (!lastVolume) {
    return null
  }

  const period = getPeriodLabel(lastVolume)
  const unit = lastVolume.unit || 'm³'
  const volumeLabel = lastVolume.value === null || lastVolume.value === undefined
    ? null
    : `${formatNumber(lastVolume.value)} ${unit}`

  return [
    period ? `Dernière période : ${period}` : null,
    volumeLabel
  ].filter(Boolean).join(' · ')
}

function getWarning({
  measurementType,
  point,
  readingDate,
  row
}) {
  if (!isIndexMeasurementType(measurementType) || !point?.lastReading || row.value === '' || !readingDate) {
    return null
  }

  const value = Number(row.value)
  const previousValue = Number(point.lastReading.value)

  if (!Number.isFinite(value) || !Number.isFinite(previousValue)) {
    return null
  }

  const readingTime = Date.parse(`${readingDate}T00:00:00.000Z`)
  const previousTime = Date.parse(point.lastReading.date)

  if (!Number.isFinite(readingTime) || !Number.isFinite(previousTime)) {
    return null
  }

  if (readingTime >= previousTime && value < previousValue) {
    return `⚠ inférieur au dernier index (${formatNumber(previousValue)} m³ au ${formatDate(point.lastReading.date)})`
  }

  if (readingTime < previousTime && value > previousValue) {
    return `⚠ date antérieure au dernier index (${formatNumber(previousValue)} m³ au ${formatDate(point.lastReading.date)})`
  }

  return null
}

function buildUsageOptionsForPoint(point, globalUsageOptions) {
  const byValue = new Map()

  for (const usage of [
    point.lastKnownUsage,
    point.usage,
    ...(point.declarationUsageOptions ?? point.usageOptions ?? []),
    ...globalUsageOptions
  ]) {
    const option = normalizeUsageOption(usage)

    if (option.value) {
      byValue.set(option.value, option)
    }
  }

  return [...byValue.values()]
}

function getUsageCodeSortParts(option) {
  const match = /^(\d+)(.*)$/u.exec(option.code ?? '')

  return {
    number: match ? Number(match[1]) : Number.MAX_SAFE_INTEGER,
    suffix: match?.[2] ?? '',
    label: option.label ?? ''
  }
}

function compareUsageOptions(left, right) {
  const leftParts = getUsageCodeSortParts(left)
  const rightParts = getUsageCodeSortParts(right)

  return leftParts.number - rightParts.number
    || leftParts.suffix.localeCompare(rightParts.suffix, 'fr', {numeric: true})
    || leftParts.label.localeCompare(rightParts.label, 'fr')
}

function formatUsageOptionLabel(option) {
  return option.code ? `${option.code} - ${option.label}` : option.label
}

function normalizeSearchText(value) {
  return String(value ?? '').trim().toLocaleLowerCase('fr-FR')
}

function findUsageOptionById(usageOptions, usageId) {
  return usageOptions.find(option => option.value === usageId) ?? null
}

function findUsageOptionBySearchValue(usageOptions, value) {
  const normalizedValue = normalizeSearchText(value)

  if (!normalizedValue) {
    return null
  }

  return usageOptions.find(option => [
    option.code,
    option.label,
    formatUsageOptionLabel(option)
  ].some(label => normalizeSearchText(label) === normalizedValue)) ?? null
}

function getUsageSearchValue(row, usageOptions) {
  if (row.usageSearch !== undefined) {
    return row.usageSearch
  }

  const selectedUsage = findUsageOptionById(usageOptions, row.usageId)
  return selectedUsage ? formatUsageOptionLabel(selectedUsage) : ''
}

function getUsageComboboxDropdownStyle(input) {
  if (!input) {
    return null
  }

  const rect = input.getBoundingClientRect()
  const horizontalMargin = 8
  const verticalMargin = 12
  const dropdownGap = 4
  const viewportWidth = document.documentElement.clientWidth
  const width = Math.min(rect.width, viewportWidth - (horizontalMargin * 2))
  const availableBelow = window.innerHeight - rect.bottom - verticalMargin
  const availableAbove = rect.top - verticalMargin
  const openAbove = availableBelow < 220 && availableAbove > availableBelow
  const availableHeight = openAbove ? availableAbove : availableBelow
  const maxHeight = Math.max(160, Math.min(360, availableHeight - dropdownGap))
  const top = openAbove
    ? Math.max(verticalMargin, rect.top - maxHeight - dropdownGap)
    : rect.bottom + dropdownGap
  const left = Math.min(
    Math.max(horizontalMargin, rect.left),
    Math.max(horizontalMargin, viewportWidth - width - horizontalMargin)
  )

  return {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`
  }
}

function shouldUseInlineUsageDropdown() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_USAGE_DROPDOWN_MEDIA_QUERY).matches
}

function getInitialPreleveurId(availablePreleveurs) {
  if (availablePreleveurs.length === 1) {
    return getPreleveurId(availablePreleveurs[0])
  }

  return ''
}

function isQuickDeclarationEnabledForCurrentDeclarant({
  declarantRole,
  quickDeclarationEnabled,
  selectedPreleveur
}) {
  if (quickDeclarationEnabled === false) {
    return false
  }

  if (declarantRole !== 'COLLECTEUR') {
    return true
  }

  return selectedPreleveur?.quickDeclarationEnabled !== false
}

function getTargetDeclarantUserId(shouldSelectPreleveur, selectedPreleveurId) {
  return shouldSelectPreleveur ? selectedPreleveurId : undefined
}

function canSubmitQuickDeclaration({
  context,
  entries,
  isContextLoading,
  isSubmitting,
  validationErrors
}) {
  return !isSubmitting
    && !isContextLoading
    && Boolean(context)
    && entries.length > 0
    && validationErrors.length === 0
}

function getSubmitButtonLabel(isSubmitting, entriesCount, measurementType) {
  if (isSubmitting) {
    return 'Soumission…'
  }

  if (entriesCount > 0) {
    const noun = getMeasurementEntryNoun(measurementType)
    return `Soumettre ${entriesCount} ${noun}${entriesCount > 1 ? 's' : ''}`
  }

  return 'Soumettre'
}

function getOverwriteSubmitButtonLabel(submitButtonLabel, overwriteWarning) {
  if (overwriteWarning?.needsConfirmation) {
    return 'Confirmer l’écrasement et soumettre'
  }

  return submitButtonLabel
}

function getQuickDeclarationSubmitSignature({
  declarantUserId,
  entries,
  measurementType,
  periodEndDate,
  periodStartDate,
  pointUsageNames = [],
  readingDate
}) {
  return JSON.stringify({
    declarantUserId: declarantUserId ?? null,
    entries: [...entries]
      .map(entry => ({
        pointPrelevementId: entry.pointPrelevementId,
        usageId: entry.usageId,
        value: entry.value ?? entry.index ?? null
      }))
      .sort((a, b) => a.pointPrelevementId.localeCompare(b.pointPrelevementId)),
    measurementType,
    periodEndDate,
    periodStartDate,
    pointUsageNames: [...pointUsageNames]
      .sort((a, b) => a.pointPrelevementId.localeCompare(b.pointPrelevementId)),
    readingDate
  })
}

function getConflictMetricLabel(metricTypeCode) {
  if (metricTypeCode === 'volume rejeté') {
    return 'volume rejeté'
  }

  return 'volume prélevé'
}

function getConflictValueLabel(conflict) {
  const value = formatNumber(conflict.value, {maximumFractionDigits: 2})

  return `${value} ${conflict.unit || 'm³'}`
}

function getConflictDeclarationURL(conflict) {
  if (conflict.declarationId) {
    return getMyDeclarationURL({id: conflict.declarationId})
  }

  return null
}

function getConflictDeclarationLabel(conflict) {
  if (conflict.declarationCode) {
    return `Déclaration n°${conflict.declarationCode}`
  }

  if (conflict.declarationId) {
    return 'Déclaration source'
  }

  if (conflict.sourceId) {
    return 'Source sans déclaration associée'
  }

  return 'Origine non renseignée'
}

function groupOverwriteConflictsByPoint(conflicts = []) {
  const groupsByPoint = new Map()

  for (const conflict of conflicts) {
    const pointKey = conflict.pointPrelevementId || conflict.pointPrelevementName || conflict.chunkValueId

    if (!groupsByPoint.has(pointKey)) {
      groupsByPoint.set(pointKey, {
        key: pointKey,
        pointName: conflict.pointPrelevementName || 'Point de prélèvement',
        conflicts: []
      })
    }

    groupsByPoint.get(pointKey).conflicts.push(conflict)
  }

  return [...groupsByPoint.values()]
}

function getOverwriteWarningTitle(conflicts = []) {
  if (conflicts.length === 1) {
    const [conflict] = conflicts
    const period = getPeriodLabel(conflict)
    const pointName = conflict.pointPrelevementName || 'ce point'
    const metricLabel = getConflictMetricLabel(conflict.metricTypeCode)

    if (period) {
      return `Le ${metricLabel} de ${pointName} sur ${period} sera écrasé`
    }

    return `Le ${metricLabel} de ${pointName} sera écrasé`
  }

  return `${conflicts.length} volumes existants seront écrasés`
}

function getOverwriteWarningDescription(conflicts = []) {
  if (conflicts.length === 1) {
    return 'En confirmant, ce volume existant sera remplacé par votre nouvelle saisie.'
  }

  return 'En confirmant, les volumes suivants seront remplacés par votre nouvelle saisie.'
}

function getMeasurementDateValidationErrors({
  maxReadingDate,
  measurementType,
  periodEndDate,
  periodStartDate,
  readingDate
}) {
  const validationErrors = []

  if (isIndexMeasurementType(measurementType)) {
    if (!readingDate) {
      validationErrors.push('La date de relevé est obligatoire.')
    }

    if (isFutureDate(readingDate, maxReadingDate)) {
      validationErrors.push('La date de relevé ne peut pas être dans le futur.')
    }

    return validationErrors
  }

  if (!periodStartDate) {
    validationErrors.push('La date de début est obligatoire.')
  }

  if (!periodEndDate) {
    validationErrors.push('La date de fin est obligatoire.')
  }

  if (isFutureDate(periodStartDate, maxReadingDate)) {
    validationErrors.push('La date de début ne peut pas être dans le futur.')
  }

  if (isFutureDate(periodEndDate, maxReadingDate)) {
    validationErrors.push('La date de fin ne peut pas être dans le futur.')
  }

  if (periodStartDate && periodEndDate && periodEndDate < periodStartDate) {
    validationErrors.push('La date de fin doit être postérieure ou égale à la date de début.')
  }

  return validationErrors
}

function getEntryRowClassName({hasHistory, hasValue, isHighlighted}) {
  return classNames(
    'grid grid-cols-1 gap-2 border-b border-r border-l-4 px-2 py-1.5 transition md:items-start',
    'border-b-gray-200 border-r-gray-200',
    ENTRY_GRID_COLUMNS_CLASS_NAME,
    hasValue && 'border-l-green-600 bg-green-50 shadow-sm',
    !hasValue && isHighlighted && 'border-l-blue-500 bg-blue-50',
    !hasValue && !isHighlighted && hasHistory && 'border-l-gray-400 bg-gray-50 hover:bg-gray-100',
    !hasValue && !isHighlighted && !hasHistory && 'border-l-transparent bg-white hover:bg-gray-50'
  )
}

const QuickDeclarationToolbar = ({
  availablePreleveurs,
  maxReadingDate,
  measurementType,
  onPreleveurChange,
  periodEndDate,
  periodStartDate,
  readingDate,
  selectedPreleveurId,
  setMeasurementType,
  setPeriodEndDate,
  setPeriodStartDate,
  setReadingDate,
  shouldSelectPreleveur
}) => {
  const isIndexMeasurement = isIndexMeasurementType(measurementType)

  return (
    <div className='flex flex-col gap-3'>
      <div className='border border-gray-200 bg-white p-3 shadow-sm md:p-4'>
        <SegmentedControl
          className='quick-declaration-measurement-segmented fr-mb-2w'
          legend='Je souhaite déclarer'
          segments={QUICK_DECLARATION_MEASUREMENT_SEGMENTS.map(segment => ({
            iconId: segment.iconId,
            label: segment.label,
            nativeInputProps: {
              checked: measurementType === segment.value,
              onChange: () => setMeasurementType(segment.value)
            }
          }))}
        />

        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:items-start'>
          {shouldSelectPreleveur && (
            <div className='fr-select-group fr-mb-0 min-w-[220px]'>
              <label className='fr-label' htmlFor='quick-preleveur'>Déclarant</label>
              <select
                id='quick-preleveur'
                className='fr-select'
                value={selectedPreleveurId}
                onChange={event => onPreleveurChange(event.target.value)}
              >
                <option value=''>Sélectionner un déclarant</option>
                {availablePreleveurs.map(preleveur => (
                  <option key={getPreleveurId(preleveur)} value={getPreleveurId(preleveur)}>
                    {getDeclarantTitleFromUser(preleveur)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isIndexMeasurement ? (
            <div className='fr-input-group fr-mb-0 min-w-[220px]'>
              <label className='fr-label' htmlFor='quick-reading-date'>
                Date du relevé d’index
              </label>
              <input
                id='quick-reading-date'
                className='fr-input'
                type='date'
                value={readingDate}
                max={maxReadingDate}
                onChange={event => setReadingDate(event.target.value)}
              />
            </div>
          ) : (
            <DateRangePicker
              endDate={periodEndDate}
              maxDate={maxReadingDate}
              startDate={periodStartDate}
              onChange={({endDate, startDate}) => {
                setPeriodStartDate(startDate)
                setPeriodEndDate(endDate)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const QuickDeclarationStatusAlerts = ({
  context,
  contextError,
  isContextLoading,
  pointsCount,
  selectedPreleveur,
  selectedPreleveurId,
  shouldSelectPreleveur
}) => (
  <>
    {isContextLoading && (
      <Alert
        className='fr-mb-2w'
        severity='info'
        title='Chargement des points'
        description='Récupération des points de prélèvement.'
      />
    )}

    {contextError && (
      <Alert
        className='fr-mb-2w'
        severity='error'
        title='Impossible de charger les points'
        description='Réessayez plus tard ou déposez un fichier.'
      />
    )}

    {shouldSelectPreleveur && !selectedPreleveurId && (
      <Alert
        className='fr-mb-2w'
        severity='info'
        title='Sélectionnez un déclarant'
        description='La liste des points et la carte s’afficheront ensuite.'
      />
    )}

    {shouldSelectPreleveur && selectedPreleveur && selectedPreleveur.quickDeclarationEnabled === false && (
      <Alert
        className='fr-mb-2w'
        severity='info'
        title='Déclarant non configuré'
        description='Sélectionnez un autre déclarant ou déposez un fichier.'
      />
    )}

    {context && pointsCount === 0 && (
      <Alert
        className='fr-mb-2w'
        severity='info'
        title='Aucun point à déclarer'
        description='Aucun point de prélèvement actif n’est rattaché à ce déclarant.'
      />
    )}
  </>
)

const UnsavedPreleveurChangeModal = ({
  close,
  confirm,
  open
}) => {
  if (!open) {
    return null
  }

  return (
    <div className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4' role='presentation'>
      <div
        aria-labelledby='quick-declaration-change-preleveur-title'
        aria-modal='true'
        className='w-full max-w-lg bg-white p-6 shadow-lg'
        role='dialog'
      >
        <h2 id='quick-declaration-change-preleveur-title' className='fr-h4 fr-mb-2w'>
          Changer de déclarant ?
        </h2>
        <p className='fr-text--sm fr-mb-4w'>
          Les données saisies sur les points ne seront pas conservées si vous sélectionnez un autre déclarant.
        </p>
        <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <button className='fr-btn fr-btn--secondary' type='button' onClick={close}>
            Continuer la saisie
          </button>
          <button className='fr-btn' type='button' onClick={confirm}>
            Changer de déclarant
          </button>
        </div>
      </div>
    </div>
  )
}

const UsageCombobox = ({
  id,
  onFocus,
  onUsageChange,
  options,
  value,
  warning
}) => {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [dropdownStyle, setDropdownStyle] = useState(null)
  const [isFiltering, setIsFiltering] = useState(false)
  const [isInlineDropdown, setIsInlineDropdown] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listboxRef = useRef(null)
  const normalizedSearch = normalizeSearchText(value)
  const selectedUsage = findUsageOptionBySearchValue(options, value)
  const visibleOptions = useMemo(() => {
    if (!isFiltering || !normalizedSearch) {
      return options
    }

    return options.filter(option => normalizeSearchText(formatUsageOptionLabel(option)).includes(normalizedSearch))
  }, [isFiltering, normalizedSearch, options])

  const updateDropdownPosition = useCallback(() => {
    const useInlineDropdown = shouldUseInlineUsageDropdown()

    setIsInlineDropdown(useInlineDropdown)
    setDropdownStyle(useInlineDropdown ? null : getUsageComboboxDropdownStyle(inputRef.current))
  }, [])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleClickOutside = event => {
      if (
        !containerRef.current?.contains(event.target)
        && !listboxRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    updateDropdownPosition()
    window.addEventListener('resize', updateDropdownPosition)
    document.addEventListener('scroll', updateDropdownPosition, true)

    return () => {
      window.removeEventListener('resize', updateDropdownPosition)
      document.removeEventListener('scroll', updateDropdownPosition, true)
    }
  }, [open, updateDropdownPosition])

  useEffect(() => {
    const selectedIndex = selectedUsage
      ? visibleOptions.findIndex(option => option.value === selectedUsage.value)
      : -1

    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [selectedUsage, visibleOptions])

  useEffect(() => {
    if (!open) {
      return
    }

    listboxRef.current
      ?.querySelector(`[data-option-index="${activeIndex}"]`)
      ?.scrollIntoView({block: 'nearest'})
  }, [activeIndex, open])

  const openDropdown = useCallback(({filter = false} = {}) => {
    setIsFiltering(filter)
    updateDropdownPosition()
    setOpen(true)
  }, [updateDropdownPosition])

  const selectUsage = useCallback(usage => {
    onUsageChange({
      usageId: usage.value,
      usageSearch: formatUsageOptionLabel(usage)
    })
    setIsFiltering(false)
    setOpen(false)
  }, [onUsageChange])

  const listbox = open && (isInlineDropdown || dropdownStyle) && (
    <div
      ref={listboxRef}
      id={`${id}-listbox`}
      className={classNames(
        'quick-declaration-usage-listbox z-[1200] overflow-auto border border-gray-300 bg-white shadow-lg',
        isInlineDropdown ? 'absolute right-0 left-0 top-full mt-1 max-h-64' : 'fixed'
      )}
      role='listbox'
      style={isInlineDropdown ? undefined : dropdownStyle}
    >
      {visibleOptions.length > 0 ? visibleOptions.map((usage, index) => {
        const isActive = index === activeIndex
        const isSelected = usage.value === selectedUsage?.value

        return (
          <button
            key={usage.value}
            id={`${id}-option-${index}`}
            data-option-index={index}
            type='button'
            role='option'
            aria-selected={isSelected}
            className={classNames(
              'relative block w-full cursor-pointer border-b border-gray-100 py-2 pr-3 text-left text-xs last:border-b-0',
              isSelected ? 'pl-7' : 'pl-3',
              isActive ? 'bg-blue-50 text-blue-900' : 'bg-white hover:bg-gray-50',
              isSelected && 'font-semibold'
            )}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseDown={event => {
              event.preventDefault()
              selectUsage(usage)
            }}
          >
            {isSelected && (
              <span
                className='fr-icon-check-line absolute left-3 top-[0.62rem] text-[#18753c]'
                aria-hidden='true'
              />
            )}
            <span className='min-w-0'>
              <span className='block'>{formatUsageOptionLabel(usage)}</span>
              {usage.definition && (
                <span className='mt-0.5 block text-xs font-normal text-gray-600'>{usage.definition}</span>
              )}
            </span>
          </button>
        )
      }) : (
        <p className='fr-hint-text fr-mb-0 px-3 py-2 text-sm'>Aucun usage trouvé.</p>
      )}
    </div>
  )
  const activeDescendant = open && visibleOptions[activeIndex] ? `${id}-option-${activeIndex}` : undefined

  return (
    <div ref={containerRef} className='quick-declaration-combobox relative'>
      <input
        ref={inputRef}
        id={id}
        className='fr-input quick-declaration-control quick-declaration-combobox-input text-xs'
        type='text'
        role='combobox'
        aria-autocomplete='list'
        aria-activedescendant={activeDescendant}
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-haspopup='listbox'
        value={value}
        placeholder='Rechercher'
        autoComplete='off'
        onFocus={event => {
          onFocus?.()
          event.target.select()
          openDropdown({filter: false})
        }}
        onChange={event => {
          const usageSearch = event.target.value
          const selectedUsage = findUsageOptionBySearchValue(options, usageSearch)

          onUsageChange({
            usageSearch,
            usageId: selectedUsage?.value ?? ''
          })
          openDropdown({filter: true})
        }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            openDropdown({filter: open ? isFiltering : false})
            setActiveIndex(index => Math.min(index + 1, Math.max(visibleOptions.length - 1, 0)))
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault()
            openDropdown({filter: open ? isFiltering : false})
            setActiveIndex(index => Math.max(index - 1, 0))
          }

          if (event.key === 'Enter' && open && visibleOptions[activeIndex]) {
            event.preventDefault()
            selectUsage(visibleOptions[activeIndex])
          }

          if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      <button
        type='button'
        tabIndex={-1}
        className='quick-declaration-combobox-toggle fr-icon-arrow-down-s-line'
        aria-label={open ? 'Fermer la liste des usages' : 'Ouvrir la liste des usages'}
        onMouseDown={event => event.preventDefault()}
        onClick={() => {
          inputRef.current?.focus()
          inputRef.current?.select()

          if (open) {
            setOpen(false)
            return
          }

          openDropdown({filter: false})
        }}
      />
      {isInlineDropdown ? listbox : (typeof document === 'undefined' ? null : createPortal(listbox, document.body))}

      {warning && (
        <p className='fr-hint-text fr-mb-0 mt-2 text-[0.72rem] leading-tight text-orange-700'>
          {warning}
        </p>
      )}
    </div>
  )
}

const DateRangePicker = ({
  endDate,
  maxDate,
  onChange,
  startDate
}) => {
  const selectedStart = parseDateInput(startDate)
  const max = parseDateInput(maxDate)
  const [open, setOpen] = useState(false)
  const [draftStartDate, setDraftStartDate] = useState(startDate)
  const [draftEndDate, setDraftEndDate] = useState(endDate)
  const [hoveredDate, setHoveredDate] = useState(null)
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(selectedStart ?? max ?? new Date()))
  const containerRef = useRef(null)
  const calendarDays = useMemo(() => buildCalendarDays(displayMonth), [displayMonth])
  const presets = useMemo(() => buildMonthlyDateRangePresets(maxDate), [maxDate])
  const draftStart = parseDateInput(draftStartDate)
  const draftEnd = parseDateInput(draftEndDate)
  const hoveredEnd = draftStart && !draftEnd && hoveredDate && hoveredDate >= draftStart ? hoveredDate : null
  const previewEnd = draftEnd ?? hoveredEnd
  const previewEndDate = previewEnd ? toDateInputValue(previewEnd) : ''

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleClickOutside = event => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const resetDraftRange = useCallback(() => {
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
    setHoveredDate(null)
  }, [endDate, startDate])

  const validateDraftRange = useCallback(() => {
    if (!draftStartDate || !draftEndDate) {
      return
    }

    onChange({
      startDate: draftStartDate,
      endDate: draftEndDate
    })
    setHoveredDate(null)
    setOpen(false)
  }, [draftEndDate, draftStartDate, onChange])

  const cancelDraftRange = useCallback(() => {
    resetDraftRange()
    setOpen(false)
  }, [resetDraftRange])

  const handleDayClick = useCallback(day => {
    const dayValue = toDateInputValue(day)

    if (!draftStart || draftEnd) {
      setDraftStartDate(dayValue)
      setDraftEndDate('')
      setHoveredDate(null)
      return
    }

    if (day < draftStart) {
      setDraftStartDate(dayValue)
      setDraftEndDate('')
      setHoveredDate(null)
      return
    }

    setDraftEndDate(dayValue)
    setHoveredDate(null)
  }, [draftEnd, draftStart])

  return (
    <div ref={containerRef} className='relative min-w-0 sm:min-w-[320px]'>
      <label className='fr-label' htmlFor='quick-period-range'>
        <span>Période déclarée</span>
        <span className='fr-hint-text'>Sélectionnez la période couverte par le volume déclaré.</span>
      </label>
      <button
        id='quick-period-range'
        className='fr-btn fr-input flex h-10 min-h-10 w-full items-center justify-between gap-2 overflow-hidden whitespace-nowrap text-left font-normal'
        type='button'
        aria-expanded={open}
        aria-haspopup='dialog'
        onClick={() => {
          if (!open) {
            resetDraftRange()
            setDisplayMonth(startOfMonth(selectedStart ?? max ?? new Date()))
          }

          setOpen(value => !value)
        }}
      >
        <span className='min-w-0 flex-1 truncate'>{getDateRangeLabel(startDate, endDate)}</span>
        <span className='fr-icon-calendar-line shrink-0' aria-hidden='true' />
      </button>

      {open && (
        <div className='absolute left-0 top-[calc(100%+0.25rem)] z-[9999] w-[min(22rem,calc(100vw-2rem))] bg-white border rounded-sm shadow-md p-3' role='dialog'>
          <div className='mb-3'>
            <p className='fr-mb-1v text-xs font-medium text-gray-900'>Périodes suggérées</p>
            <div className='flex flex-wrap gap-1.5'>
              {presets.map(preset => (
                <button
                  key={preset.label}
                  className='fr-btn fr-btn--secondary fr-btn--sm'
                  type='button'
                  onClick={() => {
                    setDraftStartDate(preset.startDate)
                    setDraftEndDate(preset.endDate)
                    setHoveredDate(null)
                    setDisplayMonth(startOfMonth(parseDateInput(preset.startDate)))
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className='mb-2 flex items-center justify-between gap-2'>
            <button
              className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm'
              type='button'
              aria-label='Mois précédent'
              onClick={() => setDisplayMonth(month => addMonths(month, -1))}
            >
              <span className='fr-icon-arrow-left-s-line' aria-hidden='true' />
            </button>
            <p className='fr-mb-0 text-sm font-semibold capitalize'>{getMonthLabel(displayMonth)}</p>
            <button
              className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm'
              type='button'
              aria-label='Mois suivant'
              disabled={max && startOfMonth(addMonths(displayMonth, 1)) > startOfMonth(max)}
              onClick={() => setDisplayMonth(month => addMonths(month, 1))}
            >
              <span className='fr-icon-arrow-right-s-line' aria-hidden='true' />
            </button>
          </div>

          <div className='grid grid-cols-7 gap-0.5 text-center text-xs font-medium text-gray-500'>
            {DATE_RANGE_WEEKDAYS.map(day => (
              <span key={day.key}>{day.label}</span>
            ))}
          </div>
          <div className='mt-1 grid grid-cols-7 gap-0.5' onMouseLeave={() => setHoveredDate(null)}>
            {calendarDays.map(day => {
              const dateValue = toDateInputValue(day)
              const outsideMonth = day.getMonth() !== displayMonth.getMonth()
              const disabled = max && day > max
              const selected = isSameDate(day, draftStart) || isSameDate(day, draftEnd) || isSameDate(day, hoveredEnd)
              const inRange = isDateInRange(day, draftStart, previewEnd)

              return (
                <button
                  key={dateValue}
                  className={classNames(
                    'h-7 text-xs transition rounded',
                    outsideMonth && 'text-gray-400',
                    !disabled && !selected && !inRange && 'hover:bg-[var(--background-alt-blue-france)]',
                    inRange && !selected && 'bg-[var(--background-contrast-blue-ecume)] text-[var(--background-active-blue-france)]',
                    selected && 'rounded-full bg-[var(--background-active-blue-france)] font-semibold text-white',
                    disabled && 'cursor-not-allowed text-gray-300'
                  )}
                  type='button'
                  disabled={disabled}
                  onMouseEnter={() => setHoveredDate(day)}
                  onClick={() => handleDayClick(day)}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>

          <div className='fr-mt-2w border-t border-gray-200 pt-3'>
            <p className='fr-mb-2w min-h-4 text-xs font-medium text-[var(--background-active-blue-france)]'>
              {draftStartDate ? getDateRangeLabel(draftStartDate, previewEndDate) : 'Sélectionnez une date de début'}
            </p>
            <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
              <button className='fr-btn fr-btn--secondary fr-btn--sm' type='button' onClick={cancelDraftRange}>
                Annuler
              </button>
              <button
                className='fr-btn fr-btn--sm'
                type='button'
                disabled={!draftStartDate || !draftEndDate}
                onClick={validateDraftRange}
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const QuickDeclarationEntryRow = ({
  activePointId,
  focusNextPoint,
  focusPoint,
  globalUsageOptions,
  handleValueChange,
  hoveredPointId,
  inputRefs,
  measurementType,
  point,
  readingDate,
  row,
  setActivePointId,
  setHoveredPointId,
  updateRow
}) => {
  const pointId = getPointId(point)
  const hasValue = row.value !== ''
  const hasHistory = hasDeclarationHistory(point)
  const isIndexMeasurement = isIndexMeasurementType(measurementType)
  const warning = getWarning({
    measurementType,
    point,
    readingDate,
    row
  })
  const lastReadingLabel = isIndexMeasurement ? getLastReadingLabel(point) : null
  const lastVolumePeriodLabel = isIndexMeasurement ? null : getLastVolumePeriodLabel(point, measurementType)
  const isHighlighted = isPointIdEqual(pointId, hoveredPointId) || isPointIdEqual(pointId, activePointId)
  const usageOptions = buildUsageOptionsForPoint(point, globalUsageOptions).sort(compareUsageOptions)
  const usageSearchValue = getUsageSearchValue(row, usageOptions)
  const usageName = getPointUsageNameDraft(point, row)
  const technicalName = getPointTechnicalName(point)
  const pointName = getPointDisplayName(point, usageName)
  const hasDistinctUsageName = pointName !== technicalName
  const valueLabel = getMeasurementInputLabel(measurementType)
  const valueInputId = `quick-value-${pointId}`
  const usageInputId = `quick-usage-${pointId}`
  const usageNameInputId = `quick-usage-name-${pointId}`

  return (
    <div
      key={pointId}
      role='listitem'
      className={getEntryRowClassName({hasHistory, hasValue, isHighlighted})}
      onMouseEnter={() => setHoveredPointId(pointId)}
      onMouseLeave={() => setHoveredPointId(null)}
    >
      <div className='min-w-0 md:pt-1'>
        <div className='flex min-w-0 flex-wrap items-baseline gap-x-1'>
          <button
            type='button'
            className={classNames(
              'fr-link min-w-0 max-w-full whitespace-normal break-words text-left text-xs leading-tight',
              hasValue ? 'font-bold' : 'font-medium'
            )}
            title={pointName}
            onClick={() => focusPoint(pointId)}
          >
            {pointName}
          </button>
          {hasDistinctUsageName && (
            <span
              className='min-w-0 break-all text-[0.68rem] leading-tight text-gray-500'
              title='Nom technique du point'
            >
              ({technicalName})
            </span>
          )}
        </div>
        <div className='quick-declaration-usage-name-field'>
          <span className='fr-icon-edit-line shrink-0' aria-hidden='true' />
          <label className='sr-only' htmlFor={usageNameInputId}>
            Nom d’usage facultatif pour {technicalName}
          </label>
          <input
            id={usageNameInputId}
            className='quick-declaration-usage-name-input'
            type='text'
            maxLength={MAX_POINT_USAGE_NAME_LENGTH}
            value={usageName}
            placeholder='Ajouter un nom d’usage'
            onFocus={() => setActivePointId(pointId)}
            onChange={event => updateRow(pointId, {usageName: event.target.value})}
          />
        </div>
        {lastReadingLabel && (
          <p className='fr-hint-text fr-mb-0 mt-1 text-[0.72rem] leading-tight'>
            Dernier index : {lastReadingLabel}
          </p>
        )}
        {lastVolumePeriodLabel && (
          <p className='fr-hint-text fr-mb-0 mt-1 text-[0.72rem] leading-tight'>
            {lastVolumePeriodLabel}
          </p>
        )}
      </div>

      <div className='fr-input-group fr-mb-0'>
        <label className='fr-label md:hidden' htmlFor={valueInputId}>{valueLabel}</label>
        <div className='quick-declaration-field relative mt-1 md:mt-0'>
          <input
            ref={node => {
              if (node) {
                inputRefs.current[pointId] = node
              } else {
                delete inputRefs.current[pointId]
              }
            }}
            id={valueInputId}
            className={classNames(
              'fr-input quick-declaration-control text-right text-xs font-semibold tabular-nums',
              hasValue && 'bg-white'
            )}
            type='text'
            inputMode='decimal'
            value={formatNumberInput(row.value)}
            placeholder='0'
            onFocus={() => setActivePointId(pointId)}
            onChange={event => handleValueChange(pointId, event)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                focusNextPoint(pointId)
              }
            }}
          />
        </div>
        {warning && (
          <p className='fr-hint-text fr-mb-0 mt-2 text-[0.72rem] leading-tight text-orange-700'>
            {warning}
          </p>
        )}
      </div>

      <div className='fr-input-group fr-mb-0'>
        <label className='fr-label md:hidden' htmlFor={usageInputId}>Usage</label>
        <div className='quick-declaration-field quick-declaration-usage-field mt-1 md:mt-0'>
          <UsageCombobox
            id={usageInputId}
            options={usageOptions}
            value={usageSearchValue}
            warning={usageSearchValue && !row.usageId ? 'Sélectionnez un usage proposé.' : null}
            onFocus={() => setActivePointId(pointId)}
            onUsageChange={changes => updateRow(pointId, changes)}
          />
        </div>
      </div>
    </div>
  )
}

const QuickDeclarationEntryList = ({
  activePointId,
  entryPoints,
  focusNextPoint,
  focusPoint,
  globalUsageOptions,
  handleValueChange,
  hoveredPointId,
  inputRefs,
  measurementType,
  readingDate,
  rows,
  setActivePointId,
  setHoveredPointId,
  updateRow
}) => (
  <div className='md:mt-1 xl:max-h-[calc(100vh-18rem)] xl:overflow-auto'>
    <div
      className={classNames(
        'hidden sticky top-0 z-10 gap-2 border-b bg-white px-2 py-1 text-xs font-bold text-gray-600 md:grid',
        ENTRY_GRID_COLUMNS_CLASS_NAME
      )}
    >
      <div>Point de prélèvement</div>
      <div>{getMeasurementInputLabel(measurementType)}</div>
      <div>Usage</div>
    </div>

    <div role='list' className='border-t border-gray-200 md:border-t-0'>
      {entryPoints.map(point => {
        const pointId = getPointId(point)

        return (
          <QuickDeclarationEntryRow
            key={pointId}
            activePointId={activePointId}
            focusNextPoint={focusNextPoint}
            focusPoint={focusPoint}
            globalUsageOptions={globalUsageOptions}
            handleValueChange={handleValueChange}
            hoveredPointId={hoveredPointId}
            inputRefs={inputRefs}
            measurementType={measurementType}
            point={point}
            readingDate={readingDate}
            row={getRowState(rows, pointId)}
            setActivePointId={setActivePointId}
            setHoveredPointId={setHoveredPointId}
            updateRow={updateRow}
          />
        )
      })}
    </div>
  </div>
)

const OverwriteConflictListItem = ({conflict}) => {
  const period = getPeriodLabel(conflict)
  const declarationURL = getConflictDeclarationURL(conflict)
  const declarationLabel = getConflictDeclarationLabel(conflict)

  return (
    <li className='border-t border-gray-200 py-2 first:border-t-0'>
      <div className='flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4'>
        <div className='min-w-0'>
          <p className='fr-mb-0 text-sm font-medium text-gray-900'>
            {getConflictMetricLabel(conflict.metricTypeCode)} - {getConflictValueLabel(conflict)}
          </p>
          {period && (
            <p className='fr-hint-text fr-mb-0 text-sm'>
              Période : {period}
            </p>
          )}
        </div>
        {declarationURL ? (
          <Link className='fr-link shrink-0 text-sm' href={declarationURL}>
            {declarationLabel}
          </Link>
        ) : (
          <span className='shrink-0 text-sm text-gray-600'>{declarationLabel}</span>
        )}
      </div>
    </li>
  )
}

const OverwriteConflictPointGroup = ({group}) => (
  <section className='border-b border-gray-200 p-3 last:border-b-0'>
    <div className='fr-mb-1v flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between'>
      <p className='fr-mb-0 font-semibold text-gray-900'>{group.pointName}</p>
      <p className='fr-mb-0 text-xs uppercase tracking-wide text-gray-500'>
        {group.conflicts.length} volume{group.conflicts.length > 1 ? 's' : ''}
      </p>
    </div>
    <ul className='fr-mb-0 list-none pl-0'>
      {group.conflicts.map(conflict => (
        <OverwriteConflictListItem key={conflict.chunkValueId} conflict={conflict} />
      ))}
    </ul>
  </section>
)

const OverwriteConflictsList = ({conflicts}) => {
  const groups = groupOverwriteConflictsByPoint(conflicts)

  return (
    <div className='fr-mt-2w max-h-80 overflow-y-auto border border-gray-200 bg-white'>
      {groups.map(group => (
        <OverwriteConflictPointGroup key={group.key} group={group} />
      ))}
    </div>
  )
}

const QuickDeclarationSubmission = ({
  canSubmit,
  entries,
  hasAnyValue,
  measurementType,
  overwriteWarning,
  submit,
  submitButtonLabel,
  submitResult,
  validationErrors
}) => (
  <>
    {validationErrors.length > 0 && hasAnyValue && (
      <Alert
        className='fr-mb-2w'
        severity='error'
        title='Saisie incomplète'
        description={validationErrors[0]}
      />
    )}

    {overwriteWarning?.needsConfirmation && (
      <Alert
        className='fr-mb-2w'
        severity='warning'
        title={getOverwriteWarningTitle(overwriteWarning.conflicts)}
        description={(
          <>
            <p className='fr-mb-1w'>
              {getOverwriteWarningDescription(overwriteWarning.conflicts)}
            </p>
            <OverwriteConflictsList conflicts={overwriteWarning.conflicts} />
          </>
        )}
      />
    )}

    <div className='fr-mt-2w flex flex-col gap-2 md:flex-row md:items-center'>
      <Button priority='primary' disabled={!canSubmit} onClick={submit}>
        {getOverwriteSubmitButtonLabel(submitButtonLabel, overwriteWarning)}
      </Button>
      {entries.length === 0 && (
        <p className='fr-hint-text fr-mb-0'>
          Saisissez au moins {isIndexMeasurementType(measurementType) ? 'un index' : 'un volume'} pour soumettre.
        </p>
      )}
    </div>

    {submitResult?.status === 'success' && (
      <Alert
        className='fr-mt-2w'
        severity='success'
        title='Déclaration créée'
        description={submitResult.message}
      />
    )}

    {submitResult?.status === 'error' && (
      <Alert
        className='fr-mt-2w'
        severity='error'
        title='Soumission impossible'
        description={submitResult.message}
      />
    )}
  </>
)

const QuickDeclarationEntriesPanel = ({
  activePointId,
  canSubmit,
  comment,
  context,
  entries,
  entryPoints,
  focusNextPoint,
  focusPoint,
  globalUsageOptions,
  handleValueChange,
  hasAnyValue,
  hoveredPointId,
  inputRefs,
  measurementType,
  overwriteWarning,
  pointsCount,
  readingDate,
  rows,
  setActivePointId,
  setComment,
  setHoveredPointId,
  submit,
  submitButtonLabel,
  submitResult,
  updateRow,
  validationErrors
}) => {
  if (!context || pointsCount === 0) {
    return null
  }

  return (
    <>
      <QuickDeclarationEntryList
        activePointId={activePointId}
        entryPoints={entryPoints}
        focusNextPoint={focusNextPoint}
        focusPoint={focusPoint}
        globalUsageOptions={globalUsageOptions}
        handleValueChange={handleValueChange}
        hoveredPointId={hoveredPointId}
        inputRefs={inputRefs}
        measurementType={measurementType}
        readingDate={readingDate}
        rows={rows}
        setActivePointId={setActivePointId}
        setHoveredPointId={setHoveredPointId}
        updateRow={updateRow}
      />

      <div className='fr-input-group fr-mt-2w fr-mb-2w'>
        <label className='fr-label' htmlFor='quick-comment'>Commentaire facultatif</label>
        <textarea
          id='quick-comment'
          className='fr-input'
          rows={2}
          value={comment}
          onChange={event => setComment(event.target.value)}
        />
      </div>

      <QuickDeclarationSubmission
        canSubmit={canSubmit}
        entries={entries}
        hasAnyValue={hasAnyValue}
        measurementType={measurementType}
        overwriteWarning={overwriteWarning}
        submit={submit}
        submitButtonLabel={submitButtonLabel}
        submitResult={submitResult}
        validationErrors={validationErrors}
      />
    </>
  )
}

const QuickDeclarationMapPanel = ({
  activePointId,
  context,
  declaredPointIds,
  declarantName,
  entryPoints,
  focusPoint,
  hoveredPointId,
  pointDisplayNames,
  pointsCount,
  selectedPointIds,
  setHoveredPointId
}) => {
  if (!context || pointsCount === 0) {
    return null
  }

  const pointsContactMailto = buildPointsContactMailto(declarantName)

  return (
    <aside className='sticky top-0 z-20 order-2 self-start bg-white pb-2 shadow-sm xl:order-none xl:col-start-2 xl:row-start-1 xl:top-3 xl:pb-0 xl:shadow-none'>
      <div className='fr-mb-1v text-center'>
        <a
          className='fr-link text-xs'
          href={pointsContactMailto}
          rel='noreferrer'
          target='_blank'
        >
          Signaler une modification sur mes points
        </a>
      </div>
      <div className='h-[220px] sm:h-[260px] md:h-[300px] xl:h-[calc(100vh-4rem)]'>
        <QuickDeclarationMap
          points={entryPoints}
          activePointId={activePointId}
          hoveredPointId={hoveredPointId}
          pointDisplayNames={pointDisplayNames}
          selectedPointIds={selectedPointIds}
          declaredPointIds={declaredPointIds}
          onHoverPoint={setHoveredPointId}
          onFocusPoint={focusPoint}
        />
      </div>
    </aside>
  )
}

const QuickDeclarationForm = ({
  availablePreleveurs = [],
  declarantRole,
  quickDeclarationEnabled = true,
  canCreateQuickDeclaration = true,
  onDirtyChange,
  onSubmitted
}) => {
  const {user} = useAuth()
  const initialPreleveurId = getInitialPreleveurId(availablePreleveurs)
  const [selectedPreleveurId, setSelectedPreleveurId] = useState(initialPreleveurId)
  const [context, setContext] = useState(null)
  const [contextError, setContextError] = useState(null)
  const [isContextLoading, setIsContextLoading] = useState(false)
  const maxReadingDate = useMemo(todayISO, [])
  const [measurementType, setMeasurementType] = useState(QUICK_DECLARATION_MEASUREMENT_TYPES.INDEX)
  const [readingDate, setReadingDate] = useState(maxReadingDate)
  const [periodStartDate, setPeriodStartDate] = useState('')
  const [periodEndDate, setPeriodEndDate] = useState('')
  const [comment, setComment] = useState('')
  const [rows, setRows] = useState({})
  const [activePointId, setActivePointId] = useState(null)
  const [hoveredPointId, setHoveredPointId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)
  const [overwriteWarning, setOverwriteWarning] = useState(null)
  const [pendingPreleveurId, setPendingPreleveurId] = useState(null)
  const [preleveurChangeModalOpen, setPreleveurChangeModalOpen] = useState(false)
  const inputRefs = useRef({})

  const selectedPreleveur = useMemo(
    () => availablePreleveurs.find(preleveur => getPreleveurId(preleveur) === selectedPreleveurId) ?? null,
    [availablePreleveurs, selectedPreleveurId]
  )

  const shouldSelectPreleveur = declarantRole === 'COLLECTEUR'
  const quickEnabledForCurrentDeclarant = isQuickDeclarationEnabledForCurrentDeclarant({
    declarantRole,
    quickDeclarationEnabled,
    selectedPreleveur
  })
  const targetDeclarantUserId = getTargetDeclarantUserId(shouldSelectPreleveur, selectedPreleveurId)
  const contactDeclarantName = useMemo(
    () => getDeclarantContactName(shouldSelectPreleveur ? selectedPreleveur : user),
    [selectedPreleveur, shouldSelectPreleveur, user]
  )

  const points = useMemo(() => context?.points ?? [], [context?.points])
  const entryPoints = useMemo(
    () => [...points].sort(comparePointsForEntry),
    [points]
  )
  const globalUsageOptions = useMemo(
    () => (context?.usageOptions?.length > 0 ? context.usageOptions : []),
    [context?.usageOptions]
  )
  const pointsCount = points.length
  const selectedPointIds = useMemo(
    () => Object.entries(rows)
      .filter(([pointId]) => getRowState(rows, pointId).value !== '')
      .map(([pointId]) => pointId),
    [rows]
  )
  const declaredPointIds = useMemo(
    () => points
      .filter(point => hasDeclarationHistory(point))
      .map(point => getPointId(point)),
    [points]
  )
  const pointUsageNames = useMemo(
    () => buildPointUsageNameChanges(points, rows),
    [points, rows]
  )
  const pointDisplayNames = useMemo(
    () => buildPointDisplayNames(points, rows),
    [points, rows]
  )

  useEffect(() => {
    let ignore = false

    const loadContext = async () => {
      setContext(null)
      setContextError(null)
      setSubmitResult(null)
      setActivePointId(null)
      setHoveredPointId(null)

      if (shouldSelectPreleveur && !selectedPreleveurId) {
        return
      }

      if (!canCreateQuickDeclaration || !quickEnabledForCurrentDeclarant) {
        return
      }

      setIsContextLoading(true)

      try {
        const result = await getQuickDeclarationContextAction({declarantUserId: targetDeclarantUserId})

        if (ignore) {
          return
        }

        if (!result?.success || !result.data?.success) {
          throw new Error(result?.error || result?.data?.message || 'Impossible de charger la saisie rapide.')
        }

        const payload = result.data.data

        setContext(payload)
        setRows(previous => Object.fromEntries((payload.points ?? []).map(point => {
          const pointId = getPointId(point)
          return [pointId, previous[pointId] ?? getInitialRow(point)]
        })))
      } catch (error) {
        console.error(error)
        setContextError(error?.message || 'Impossible de charger la saisie rapide.')
      } finally {
        if (!ignore) {
          setIsContextLoading(false)
        }
      }
    }

    loadContext()

    return () => {
      ignore = true
    }
  }, [
    canCreateQuickDeclaration,
    quickEnabledForCurrentDeclarant,
    selectedPreleveurId,
    shouldSelectPreleveur,
    targetDeclarantUserId
  ])

  const updateRow = useCallback((pointId, changes) => {
    setRows(previous => ({
      ...previous,
      [pointId]: {
        ...getRowState(previous, pointId),
        ...changes
      }
    }))
  }, [])

  const focusPoint = useCallback(pointId => {
    setActivePointId(pointId)
    setHoveredPointId(pointId)

    const input = inputRefs.current[pointId]
    if (input) {
      input.focus({preventScroll: true})
    }
  }, [])

  const focusNextPoint = useCallback(pointId => {
    const currentIndex = entryPoints.findIndex(point => isPointIdEqual(getPointId(point), pointId))

    if (currentIndex < 0) {
      return
    }

    const nextPoint = entryPoints[currentIndex + 1]

    if (nextPoint) {
      focusPoint(getPointId(nextPoint))
    }
  }, [entryPoints, focusPoint])

  const handleValueChange = useCallback((pointId, event) => {
    const editableCharactersCount = countEditableNumberCharacters(
      event.target.value,
      event.target.selectionStart ?? event.target.value.length
    )
    const value = normalizeNumberInput(event.target.value)

    updateRow(pointId, {value})

    requestAnimationFrame(() => {
      const input = inputRefs.current[pointId]

      if (!input || document.activeElement !== input) {
        return
      }

      const position = getFormattedCaretPosition(formatNumberInput(value), editableCharactersCount)
      input.setSelectionRange(position, position)
    })
  }, [updateRow])

  const {entries, validationErrors} = useMemo(() => {
    const nextEntries = []
    const nextValidationErrors = []
    const isIndexMeasurement = isIndexMeasurementType(measurementType)
    const valueValidationLabel = getMeasurementValueValidationLabel(measurementType)

    for (const point of entryPoints) {
      const pointId = getPointId(point)
      const row = getRowState(rows, pointId)
      const pointName = getPointDisplayName(point, getPointUsageNameDraft(point, row))
      const hasValue = row.value !== ''
      const hasCompleteValue = isCompleteNumberInput(row.value)
      const hasUsage = Boolean(row.usageId)

      if (hasValue) {
        const numericValue = Number(row.value)

        if (!hasCompleteValue || !Number.isFinite(numericValue) || numericValue < 0) {
          nextValidationErrors.push(`${pointName} : ${valueValidationLabel} doit être un nombre positif.`)
        }

        if (!hasUsage) {
          nextValidationErrors.push(`${pointName} : l’usage est requis si ${valueValidationLabel} est renseigné.`)
        }

        if (hasUsage && hasCompleteValue && Number.isFinite(numericValue) && numericValue >= 0) {
          nextEntries.push({
            pointPrelevementId: pointId,
            ...(isIndexMeasurement ? {index: numericValue} : {value: numericValue}),
            usageId: row.usageId
          })
        }
      }
    }

    nextValidationErrors.push(...getMeasurementDateValidationErrors({
      maxReadingDate,
      measurementType,
      periodEndDate,
      periodStartDate,
      readingDate
    }))

    return {
      entries: nextEntries,
      validationErrors: nextValidationErrors
    }
  }, [entryPoints, maxReadingDate, measurementType, periodEndDate, periodStartDate, readingDate, rows])

  const hasAnyValue = useMemo(
    () => Object.values(rows).some(row => (row.value ?? row.index ?? '') !== ''),
    [rows]
  )
  const hasPointUsageNameChanges = pointUsageNames.length > 0

  const hasUnsavedQuickDeclarationData = useMemo(() => (
    hasAnyValue
      || hasPointUsageNameChanges
      || comment.trim() !== ''
      || measurementType !== QUICK_DECLARATION_MEASUREMENT_TYPES.INDEX
      || readingDate !== maxReadingDate
      || periodStartDate !== ''
      || periodEndDate !== ''
  ), [comment, hasAnyValue, hasPointUsageNameChanges, maxReadingDate, measurementType, periodEndDate, periodStartDate, readingDate])

  useEffect(() => {
    onDirtyChange?.(hasUnsavedQuickDeclarationData)
  }, [hasUnsavedQuickDeclarationData, onDirtyChange])

  const applyPreleveurChange = useCallback(nextPreleveurId => {
    setSelectedPreleveurId(nextPreleveurId)
    setRows({})
  }, [])

  const handlePreleveurChange = useCallback(nextPreleveurId => {
    if (nextPreleveurId === selectedPreleveurId) {
      return
    }

    if (hasAnyValue || hasPointUsageNameChanges) {
      setPendingPreleveurId(nextPreleveurId)
      setPreleveurChangeModalOpen(true)
      return
    }

    applyPreleveurChange(nextPreleveurId)
  }, [applyPreleveurChange, hasAnyValue, hasPointUsageNameChanges, selectedPreleveurId])

  const closePreleveurChangeModal = useCallback(() => {
    setPendingPreleveurId(null)
    setPreleveurChangeModalOpen(false)
  }, [])

  const confirmPreleveurChange = useCallback(() => {
    applyPreleveurChange(pendingPreleveurId ?? '')
    setPendingPreleveurId(null)
    setPreleveurChangeModalOpen(false)
  }, [applyPreleveurChange, pendingPreleveurId])

  const canSubmit = canSubmitQuickDeclaration({
    context,
    entries,
    isContextLoading,
    isSubmitting,
    validationErrors
  })
  const submitButtonLabel = getSubmitButtonLabel(isSubmitting, entries.length, measurementType)
  const submitSignature = useMemo(() => getQuickDeclarationSubmitSignature({
    declarantUserId: targetDeclarantUserId,
    entries,
    measurementType,
    periodEndDate,
    periodStartDate,
    pointUsageNames,
    readingDate
  }), [entries, measurementType, periodEndDate, periodStartDate, pointUsageNames, readingDate, targetDeclarantUserId])
  const activeOverwriteWarning = overwriteWarning?.signature === submitSignature
    ? overwriteWarning
    : null

  const submit = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      if (!canSubmit) {
        throw new Error(validationErrors[0] || 'Saisie incomplète.')
      }

      const datePayload = isIndexMeasurementType(measurementType)
        ? {readingDate}
        : {periodStartDate, periodEndDate}

      if (!isIndexMeasurementType(measurementType) && activeOverwriteWarning?.confirmed !== true) {
        const previewResult = await previewQuickDeclarationConflictsAction({
          declarantUserId: targetDeclarantUserId,
          measurementType,
          ...datePayload,
          comment,
          entries
        })

        if (!previewResult?.success || previewResult.data?.success !== true) {
          throw new Error(previewResult?.error || previewResult?.data?.message || 'Impossible de vérifier les écrasements.')
        }

        const conflicts = previewResult.data?.data?.conflicts ?? []

        if (conflicts.length > 0) {
          setOverwriteWarning({
            signature: submitSignature,
            conflicts,
            needsConfirmation: true,
            confirmed: true
          })
          return
        }
      }

      const result = await createQuickDeclarationAction({
        declarantUserId: targetDeclarantUserId,
        measurementType,
        ...datePayload,
        comment,
        entries,
        pointUsageNames
      })

      if (!result?.success || !result.data?.success) {
        throw new Error(result?.error || result?.data?.message || 'Erreur lors de la création de la déclaration.')
      }

      setOverwriteWarning(null)
      setSubmitResult({status: 'success', message: 'Déclaration créée avec succès.'})
      onSubmitted?.()
      window.location.href = getMyDeclarationSubmissionSuccessURL(result.data.data)
    } catch (error) {
      console.error(error)
      setSubmitResult({
        status: 'error',
        message: error?.message || 'Erreur lors de la soumission.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    canSubmit,
    comment,
    entries,
    activeOverwriteWarning,
    measurementType,
    periodEndDate,
    periodStartDate,
    pointUsageNames,
    readingDate,
    onSubmitted,
    submitSignature,
    targetDeclarantUserId,
    validationErrors
  ])

  return (
    <div className='fr-mt-1w fr-mb-2w'>
      <div className='grid grid-cols-1 gap-x-3 gap-y-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)] xl:items-start xl:gap-y-0'>
        <div className='contents xl:col-start-1 xl:row-start-1 xl:block xl:min-w-0'>
          <div className='order-1'>
            <QuickDeclarationToolbar
              availablePreleveurs={availablePreleveurs}
              maxReadingDate={maxReadingDate}
              measurementType={measurementType}
              periodEndDate={periodEndDate}
              periodStartDate={periodStartDate}
              readingDate={readingDate}
              selectedPreleveurId={selectedPreleveurId}
              setMeasurementType={setMeasurementType}
              setPeriodEndDate={setPeriodEndDate}
              setPeriodStartDate={setPeriodStartDate}
              setReadingDate={setReadingDate}
              shouldSelectPreleveur={shouldSelectPreleveur}
              onPreleveurChange={handlePreleveurChange}
            />

            <QuickDeclarationStatusAlerts
              context={context}
              contextError={contextError}
              isContextLoading={isContextLoading}
              pointsCount={pointsCount}
              selectedPreleveur={selectedPreleveur}
              selectedPreleveurId={selectedPreleveurId}
              shouldSelectPreleveur={shouldSelectPreleveur}
            />
          </div>

          <section className='order-3 min-w-0'>
            <QuickDeclarationEntriesPanel
              activePointId={activePointId}
              canSubmit={canSubmit}
              comment={comment}
              context={context}
              entries={entries}
              entryPoints={entryPoints}
              focusNextPoint={focusNextPoint}
              focusPoint={focusPoint}
              globalUsageOptions={globalUsageOptions}
              handleValueChange={handleValueChange}
              hasAnyValue={hasAnyValue}
              hoveredPointId={hoveredPointId}
              inputRefs={inputRefs}
              measurementType={measurementType}
              overwriteWarning={activeOverwriteWarning}
              pointsCount={pointsCount}
              readingDate={readingDate}
              rows={rows}
              setActivePointId={setActivePointId}
              setComment={setComment}
              setHoveredPointId={setHoveredPointId}
              submit={submit}
              submitButtonLabel={submitButtonLabel}
              submitResult={submitResult}
              updateRow={updateRow}
              validationErrors={validationErrors}
            />
          </section>
        </div>

        <QuickDeclarationMapPanel
          activePointId={activePointId}
          context={context}
          declaredPointIds={declaredPointIds}
          declarantName={contactDeclarantName}
          entryPoints={entryPoints}
          focusPoint={focusPoint}
          hoveredPointId={hoveredPointId}
          pointDisplayNames={pointDisplayNames}
          pointsCount={pointsCount}
          selectedPointIds={selectedPointIds}
          setHoveredPointId={setHoveredPointId}
        />
      </div>

      <UnsavedPreleveurChangeModal
        open={preleveurChangeModalOpen}
        close={closePreleveurChangeModal}
        confirm={confirmPreleveurChange}
      />
    </div>
  )
}

export default QuickDeclarationForm
