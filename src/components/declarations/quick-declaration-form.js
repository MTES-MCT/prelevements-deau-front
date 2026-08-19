'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {createPortal} from 'react-dom'

import DateRangePicker from '@/components/ui/date-range-picker.js'
import {useAuth} from '@/contexts/auth-context.js'
import {getDeclarantTitleFromUser} from '@/lib/declarants.js'
import {
  getPointFlowType,
  getPointFlowTypeColors,
  POINT_FLOW_TYPES
} from '@/lib/point-flow-types.js'
import {
  buildPointDisplayNames,
  getPointDisplayName,
  getPointTechnicalName,
  getPointUsageNameDraft,
  MAX_POINT_USAGE_NAME_LENGTH,
  normalizePointUsageName,
  replacePointUsageName
} from '@/lib/quick-declaration-point-name.js'
import {matchesSearchTerms} from '@/lib/search-options.js'
import {
  getMyDeclarationSubmissionSuccessURL,
  getMyDeclarationURL
} from '@/lib/urls.js'
import {getUsageParent, normalizeUsageOption} from '@/lib/water-uses.js'
import {
  createQuickDeclarationAction,
  getQuickDeclarationContextAction,
  previewQuickDeclarationConflictsAction
} from '@/server/actions/declarations.js'
import {editPointUsageNameAction} from '@/server/actions/points-prelevement.js'
import {formatNumber} from '@/utils/number.js'

const QuickDeclarationMap = dynamic(
  () => import('./quick-declaration-map.js'),
  {
    loading: () => (
      <div className='flex h-full items-center justify-center bg-gray-100' role='status'>
        Chargement de la carte…
      </div>
    ),
    ssr: false
  }
)

const POINTS_CONTACT_EMAIL = 'contact@partageonsleau.beta.gouv.fr'
const POINTS_CONTACT_SUBJECT_SUFFIX = 'Modification sur mes points de prélèvements'
const ENTRY_GRID_COLUMNS_CLASS_NAME = 'md:grid-cols-[minmax(190px,1fr)_96px_minmax(170px,220px)]'
const MOBILE_USAGE_DROPDOWN_MEDIA_QUERY = '(max-width: 47.999rem)'

const QUICK_DECLARATION_MEASUREMENT_TYPES = Object.freeze({
  INDEX: 'INDEX',
  VOLUME: 'VOLUME'
})

const QUICK_DECLARATION_POINT_GROUPS = [
  {
    flowType: POINT_FLOW_TYPES.PRELEVEMENT,
    label: 'Points de prélèvement'
  },
  {
    flowType: POINT_FLOW_TYPES.REJET,
    label: 'Points de rejet'
  }
]
const QUICK_DECLARATION_POINT_FLOW_ORDER = Object.fromEntries(
  QUICK_DECLARATION_POINT_GROUPS.map((group, index) => [group.flowType, index])
)

const QUICK_DECLARATION_MEASUREMENT_SEGMENTS = [
  {
    value: QUICK_DECLARATION_MEASUREMENT_TYPES.INDEX,
    label: 'Relevé d’index',
    iconId: 'fr-icon-edit-line'
  },
  {
    value: QUICK_DECLARATION_MEASUREMENT_TYPES.VOLUME,
    label: 'Volume',
    iconId: 'fr-icon-drop-line'
  }
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

function classNames(...values) {
  return values.filter(Boolean).join(' ')
}

function hasDeclarationHistory(point) {
  const declarationsCount = Number(point.declarationsCount ?? point.declarationCount ?? 0)
  return Boolean(point.lastReading || point.lastDeclaration || declarationsCount > 0)
}

function comparePointsForEntry(pointA, pointB) {
  const flowTypeDifference = (QUICK_DECLARATION_POINT_FLOW_ORDER[getPointFlowType(pointA)] ?? 0)
    - (QUICK_DECLARATION_POINT_FLOW_ORDER[getPointFlowType(pointB)] ?? 0)

  if (flowTypeDifference !== 0) {
    return flowTypeDifference
  }

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

function getUsageNameFeedback(previousUsageName, nextUsageName) {
  if (previousUsageName === nextUsageName) {
    return null
  }

  if (!nextUsageName) {
    return 'Nom d’usage supprimé'
  }

  return previousUsageName ? 'Nom d’usage modifié' : 'Nom d’usage ajouté'
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
  return isIndexMeasurementType(measurementType) ? 'l’index' : 'le volume'
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

function getLastVolumePeriodLabel(point) {
  const lastVolume = getPointFlowType(point) === POINT_FLOW_TYPES.REJET
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
      byValue.set(option.value, {
        ...option,
        parentUsage: getUsageParent(usage)
      })
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
  return option.label || option.code || ''
}

function getUsageOptionSearchText(option) {
  return [
    option.code,
    option.label,
    option.parentUsage?.code,
    option.parentUsage?.label
  ].filter(Boolean).join(' ')
}

function formatUsageParentLabel(parentUsage) {
  return parentUsage?.label || parentUsage?.code || ''
}

function getUsageOptionColor(option) {
  return option.parentUsage?.color ?? option.color
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
  isUsageNameSaving,
  validationErrors
}) {
  return !isSubmitting
    && !isContextLoading
    && !isUsageNameSaving
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
    readingDate
  })
}

function getConflictMetricLabel(conflict) {
  if (conflict?.flowType === POINT_FLOW_TYPES.REJET || conflict?.metricTypeCode === 'volume rejeté') {
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
    const metricLabel = getConflictMetricLabel(conflict)

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
    'grid cursor-pointer grid-cols-1 gap-2 border-b border-r border-l-4 px-2 py-1.5 transition md:items-start',
    'border-b-gray-200 border-r-gray-200',
    ENTRY_GRID_COLUMNS_CLASS_NAME,
    hasValue && 'border-l-green-600 bg-green-50 shadow-sm',
    !hasValue && isHighlighted && 'border-l-blue-500 bg-blue-50',
    !hasValue && !isHighlighted && hasHistory && 'border-l-gray-400 bg-gray-50 hover:bg-gray-100',
    !hasValue && !isHighlighted && !hasHistory && 'border-l-transparent bg-white hover:bg-gray-50'
  )
}

function isQuickDeclarationRowControl(target) {
  return Boolean(target?.closest?.([
    'a',
    'button',
    'input',
    'label',
    'select',
    'textarea',
    '[role="button"]',
    '[role="combobox"]',
    '.fr-input-group',
    '.quick-declaration-usage-name-field'
  ].join(',')))
}

const QuickDeclarationToolbar = ({
  availablePreleveurs,
  isUsageNameSaving,
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
                disabled={isUsageNameSaving}
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
  const parentDescriptionId = selectedUsage?.parentUsage ? `${id}-parent-usage` : undefined
  const warningId = warning ? `${id}-warning` : undefined
  const describedBy = [parentDescriptionId, warningId].filter(Boolean).join(' ') || undefined
  const visibleOptions = useMemo(() => {
    if (!isFiltering || !normalizedSearch) {
      return options
    }

    return options.filter(option => matchesSearchTerms(getUsageOptionSearchText(option), normalizedSearch))
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
              'flex w-full cursor-pointer items-start gap-1.5 border-b border-gray-100 px-2 py-2 text-left text-xs last:border-b-0',
              isActive ? 'bg-blue-50 text-blue-900' : 'bg-white hover:bg-gray-50',
              isSelected && 'font-semibold',
              !usage.parentUsage && 'font-medium'
            )}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseDown={event => {
              event.preventDefault()
              selectUsage(usage)
            }}
          >
            <span className='inline-flex h-4 w-3 shrink-0 items-center justify-center' aria-hidden='true'>
              {isSelected && <span className='fr-icon-check-line text-[#18753c]' />}
            </span>
            <span className={classNames(
              'flex min-w-0 flex-1 items-start gap-2',
              usage.parentUsage && 'ml-3'
            )}
            >
              <span
                className={classNames(
                  'mt-[0.2rem] shrink-0 rounded-sm ring-1 ring-inset ring-black/15',
                  usage.parentUsage ? 'h-2 w-2' : 'h-2.5 w-2.5'
                )}
                style={{backgroundColor: getUsageOptionColor(usage)}}
                aria-hidden='true'
              />
              <span className='min-w-0'>
                <span className='quick-declaration-usage-option-label block' title={formatUsageOptionLabel(usage)}>
                  {formatUsageOptionLabel(usage)}
                </span>
              </span>
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
    <div ref={containerRef} className='quick-declaration-combobox'>
      <div className='relative'>
        {selectedUsage && (
          <span
            className='pointer-events-none absolute left-2 top-1/2 z-10 h-2.5 w-2.5 -translate-y-1/2 rounded-sm ring-1 ring-inset ring-black/15'
            style={{backgroundColor: getUsageOptionColor(selectedUsage)}}
            aria-hidden='true'
          />
        )}
        <input
          ref={inputRef}
          id={id}
          className={classNames(
            'fr-input quick-declaration-control quick-declaration-combobox-input text-xs',
            selectedUsage && 'quick-declaration-combobox-input--with-color'
          )}
          type='text'
          role='combobox'
          aria-autocomplete='list'
          aria-activedescendant={activeDescendant}
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-haspopup='listbox'
          aria-describedby={describedBy}
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
      </div>

      {selectedUsage?.parentUsage && (
        <p
          id={parentDescriptionId}
          className='fr-mb-0 mt-1 truncate text-[0.66rem] leading-tight text-gray-600'
          title={`Usage principal : ${formatUsageParentLabel(selectedUsage.parentUsage)}`}
        >
          Usage : <span className='font-medium text-gray-800'>{formatUsageParentLabel(selectedUsage.parentUsage)}</span>
        </p>
      )}

      {warning && (
        <p id={warningId} className='fr-hint-text fr-mb-0 mt-2 text-[0.72rem] leading-tight text-orange-700'>
          {warning}
        </p>
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
  onUsageNameSaved,
  onUsageNameSavingChange,
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
  const lastVolumePeriodLabel = isIndexMeasurement ? null : getLastVolumePeriodLabel(point)
  const isHighlighted = isPointIdEqual(pointId, hoveredPointId) || isPointIdEqual(pointId, activePointId)
  const usageOptions = buildUsageOptionsForPoint(point, globalUsageOptions).sort(compareUsageOptions)
  const usageSearchValue = getUsageSearchValue(row, usageOptions)
  const usageName = getPointUsageNameDraft(point, row)
  const technicalName = getPointTechnicalName(point)
  const pointName = getPointDisplayName(point, usageName)
  const hasDistinctUsageName = pointName !== technicalName
  const [isUsageNameEditing, setIsUsageNameEditing] = useState(false)
  const [isUsageNameSaving, setIsUsageNameSaving] = useState(false)
  const [usageNameDraft, setUsageNameDraft] = useState(usageName)
  const [usageNameFeedback, setUsageNameFeedback] = useState(null)
  const normalizedUsageNameDraft = normalizePointUsageName(usageNameDraft)
  const normalizedUsageName = normalizePointUsageName(usageName)
  const hasUsageNameChanged = normalizedUsageNameDraft !== normalizedUsageName
  const valueLabel = getMeasurementInputLabel(measurementType)
  const valueInputId = `quick-value-${pointId}`
  const usageInputId = `quick-usage-${pointId}`
  const usageNameInputId = `quick-usage-name-${pointId}`

  const startUsageNameEditing = () => {
    setUsageNameDraft(usageName)
    setUsageNameFeedback(null)
    setActivePointId(pointId)
    setIsUsageNameEditing(true)
  }

  const saveUsageName = async event => {
    event?.preventDefault()

    if (!hasUsageNameChanged || isUsageNameSaving) {
      return
    }

    setUsageNameFeedback(null)
    setIsUsageNameSaving(true)
    onUsageNameSavingChange(pointId, true)

    try {
      const result = await editPointUsageNameAction(pointId, normalizedUsageNameDraft || null)

      if (!result?.success) {
        setUsageNameFeedback({
          severity: 'error',
          message: result?.error || 'Le nom d’usage n’a pas pu être enregistré.'
        })
        return
      }

      const savedUsageName = normalizePointUsageName(result.data?.usageName)
      onUsageNameSaved(pointId, savedUsageName)
      setUsageNameDraft(savedUsageName)
      setIsUsageNameEditing(false)
      setUsageNameFeedback({
        severity: 'success',
        message: getUsageNameFeedback(normalizedUsageName, savedUsageName) || 'Nom d’usage enregistré'
      })
    } catch (error) {
      setUsageNameFeedback({
        severity: 'error',
        message: error?.message || 'Le nom d’usage n’a pas pu être enregistré.'
      })
    } finally {
      setIsUsageNameSaving(false)
      onUsageNameSavingChange(pointId, false)
    }
  }

  const cancelUsageNameEditing = () => {
    if (isUsageNameSaving) {
      return
    }

    setUsageNameDraft(usageName)
    setUsageNameFeedback(null)
    setIsUsageNameEditing(false)
  }

  useEffect(() => {
    if (usageNameFeedback?.severity !== 'success') {
      return undefined
    }

    const timeout = setTimeout(() => setUsageNameFeedback(null), 1800)
    return () => clearTimeout(timeout)
  }, [usageNameFeedback])

  return (
    <div
      key={pointId}
      role='listitem'
      className={getEntryRowClassName({hasHistory, hasValue, isHighlighted})}
      onClick={event => {
        if (!isQuickDeclarationRowControl(event.target)) {
          focusPoint(pointId)
        }
      }}
      onMouseEnter={() => setHoveredPointId(pointId)}
      onMouseLeave={() => setHoveredPointId(null)}
    >
      <div className='min-w-0 md:pt-1'>
        <div className='flex min-w-0 items-start gap-1'>
          <button
            type='button'
            className={classNames(
              'fr-link min-w-0 whitespace-normal break-words text-left text-xs leading-tight',
              hasValue ? 'font-bold' : 'font-medium'
            )}
            title={pointName}
            onClick={() => focusPoint(pointId)}
          >
            {pointName}
          </button>
          {!isUsageNameEditing && hasDistinctUsageName && (
            <button
              type='button'
              className='fr-icon-edit-line inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-gray-500 hover:bg-[var(--background-alt-blue-france-hover)] hover:text-[#000091] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0a76f6] [&::after]:![--icon-size:0.7rem] [&::before]:![--icon-size:0.7rem]'
              aria-label={`Modifier le nom d’usage de ${technicalName}`}
              title='Modifier le nom d’usage'
              onClick={startUsageNameEditing}
            />
          )}
        </div>
        {!isUsageNameEditing && (
          <div className='mt-0.5 flex min-h-5 min-w-0 items-center justify-between gap-2'>
            <div className='flex min-w-0 items-center gap-1'>
              {hasDistinctUsageName ? (
                <span
                  className='truncate text-[0.68rem] leading-tight text-gray-500'
                  title={`Nom technique : ${technicalName}`}
                >
                  Nom technique : {technicalName}
                </span>
              ) : (
                <button
                  type='button'
                  className='fr-icon-edit-line inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[0.68rem] leading-tight text-gray-500 hover:text-[#000091] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0a76f6] [&::after]:![--icon-size:0.68rem] [&::before]:![--icon-size:0.68rem]'
                  aria-label={`Ajouter un nom d’usage à ${technicalName}`}
                  title='Ajouter un nom d’usage'
                  onClick={startUsageNameEditing}
                >
                  Ajouter un nom d’usage
                </button>
              )}
            </div>
            {usageNameFeedback?.severity === 'success' && (
              <span
                className='inline-flex shrink-0 items-center gap-1 px-1 py-0.5 text-[0.64rem] font-medium leading-tight text-[#18753c]'
                role='status'
              >
                <span className='fr-icon-check-line text-[0.58rem]' aria-hidden='true' />
                {usageNameFeedback.message}
              </span>
            )}
          </div>
        )}
        {isUsageNameEditing && (
          <div className='min-w-0'>
            <form
              className='quick-declaration-usage-name-field'
              aria-busy={isUsageNameSaving}
              onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  cancelUsageNameEditing()
                }
              }}
              onSubmit={saveUsageName}
            >
              <label className='sr-only' htmlFor={usageNameInputId}>
                Nom d’usage facultatif pour {technicalName}
              </label>
              <input
                autoFocus
                id={usageNameInputId}
                className='quick-declaration-usage-name-input'
                type='text'
                disabled={isUsageNameSaving}
                maxLength={MAX_POINT_USAGE_NAME_LENGTH}
                value={usageNameDraft}
                placeholder='Ex. Forage de la source'
                onFocus={() => setActivePointId(pointId)}
                onChange={event => {
                  setUsageNameDraft(event.target.value)
                  setUsageNameFeedback(null)
                }}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    cancelUsageNameEditing()
                  }
                }}
              />
              <button
                type='submit'
                className='fr-icon-check-line inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#000091] hover:bg-[var(--background-alt-blue-france-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0a76f6] disabled:cursor-not-allowed disabled:opacity-40 [&::after]:![--icon-size:0.78rem] [&::before]:![--icon-size:0.78rem]'
                aria-label='Enregistrer le nom d’usage'
                disabled={!hasUsageNameChanged || isUsageNameSaving}
                title='Enregistrer le nom d’usage'
              />
              <button
                type='button'
                className='fr-icon-close-line inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0a76f6] disabled:cursor-not-allowed disabled:opacity-40 [&::after]:![--icon-size:0.78rem] [&::before]:![--icon-size:0.78rem]'
                aria-label='Annuler la modification du nom d’usage'
                disabled={isUsageNameSaving}
                title='Annuler'
                onClick={cancelUsageNameEditing}
              />
            </form>
            {usageNameFeedback?.severity === 'error' && (
              <p className='fr-error-text fr-mb-0 mt-1 text-[0.68rem] leading-tight' role='alert'>
                {usageNameFeedback.message}
              </p>
            )}
          </div>
        )}
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

      <div className='fr-input-group fr-mb-0 cursor-default'>
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

      <div className='fr-input-group fr-mb-0 cursor-default'>
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
  onUsageNameSaved,
  onUsageNameSavingChange,
  readingDate,
  rows,
  setActivePointId,
  setHoveredPointId,
  updateRow
}) => {
  const pointGroups = QUICK_DECLARATION_POINT_GROUPS
    .map(group => ({
      ...group,
      points: entryPoints.filter(point => getPointFlowType(point) === group.flowType)
    }))
    .filter(group => group.points.length > 0)

  return (
    <div className='md:mt-1 xl:max-h-[calc(100vh-18rem)] xl:overflow-auto'>
      <div className='border-t border-gray-200 md:border-t-0'>
        {pointGroups.map(group => {
          const colors = getPointFlowTypeColors(group.flowType)
          const headingId = `quick-declaration-${group.flowType.toLowerCase()}-heading`

          return (
            <section key={group.flowType} className='mt-2 first:mt-0' aria-labelledby={headingId}>
              <div
                className='px-2 py-2 text-center'
                style={{color: colors.textColor}}
              >
                <h3 id={headingId} className='fr-mb-0 whitespace-nowrap text-[0.7rem] font-semibold leading-none'>
                  {group.label}
                </h3>
              </div>

              <div
                className={classNames(
                  'hidden sticky top-0 z-10 gap-2 border-y border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-600 md:grid',
                  ENTRY_GRID_COLUMNS_CLASS_NAME
                )}
              >
                <div>Point</div>
                <div>{getMeasurementInputLabel(measurementType)}</div>
                <div>Usage</div>
              </div>

              <div role='list'>
                {group.points.map(point => {
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
                      onUsageNameSaved={onUsageNameSaved}
                      onUsageNameSavingChange={onUsageNameSavingChange}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

const OverwriteConflictListItem = ({conflict}) => {
  const period = getPeriodLabel(conflict)
  const declarationURL = getConflictDeclarationURL(conflict)
  const declarationLabel = getConflictDeclarationLabel(conflict)

  return (
    <li className='border-t border-gray-200 py-2 first:border-t-0'>
      <div className='flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4'>
        <div className='min-w-0'>
          <p className='fr-mb-0 text-sm font-medium text-gray-900'>
            {getConflictMetricLabel(conflict)} - {getConflictValueLabel(conflict)}
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
  onUsageNameSaved,
  onUsageNameSavingChange,
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
        onUsageNameSaved={onUsageNameSaved}
        onUsageNameSavingChange={onUsageNameSavingChange}
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
  focusRequestId,
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
          focusRequestId={focusRequestId}
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
  const [focusRequestId, setFocusRequestId] = useState(0)
  const [hoveredPointId, setHoveredPointId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usageNameSavingPointIds, setUsageNameSavingPointIds] = useState([])
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

  const handleUsageNameSaved = useCallback((pointId, usageName) => {
    const normalizedUsageName = normalizePointUsageName(usageName)

    setContext(previous => previous
      ? {
        ...previous,
        points: replacePointUsageName(previous.points, pointId, normalizedUsageName)
      }
      : previous)
    updateRow(pointId, {usageName: normalizedUsageName})
  }, [updateRow])

  const handleUsageNameSavingChange = useCallback((pointId, isSaving) => {
    setUsageNameSavingPointIds(previous => isSaving
      ? [...new Set([...previous, pointId])]
      : previous.filter(savedPointId => savedPointId !== pointId))
  }, [])

  const focusPoint = useCallback(pointId => {
    setActivePointId(pointId)
    setFocusRequestId(current => current + 1)
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
  const isUsageNameSaving = usageNameSavingPointIds.length > 0

  const hasUnsavedQuickDeclarationData = useMemo(() => (
    hasAnyValue
      || isUsageNameSaving
      || comment.trim() !== ''
      || measurementType !== QUICK_DECLARATION_MEASUREMENT_TYPES.INDEX
      || readingDate !== maxReadingDate
      || periodStartDate !== ''
      || periodEndDate !== ''
  ), [comment, hasAnyValue, isUsageNameSaving, maxReadingDate, measurementType, periodEndDate, periodStartDate, readingDate])

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

    if (hasAnyValue) {
      setPendingPreleveurId(nextPreleveurId)
      setPreleveurChangeModalOpen(true)
      return
    }

    applyPreleveurChange(nextPreleveurId)
  }, [applyPreleveurChange, hasAnyValue, selectedPreleveurId])

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
    isUsageNameSaving,
    validationErrors
  })
  const submitButtonLabel = getSubmitButtonLabel(isSubmitting, entries.length, measurementType)
  const submitSignature = useMemo(() => getQuickDeclarationSubmitSignature({
    declarantUserId: targetDeclarantUserId,
    entries,
    measurementType,
    periodEndDate,
    periodStartDate,
    readingDate
  }), [entries, measurementType, periodEndDate, periodStartDate, readingDate, targetDeclarantUserId])
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
        entries
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
              isUsageNameSaving={isUsageNameSaving}
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
              onUsageNameSaved={handleUsageNameSaved}
              onUsageNameSavingChange={handleUsageNameSavingChange}
            />
          </section>
        </div>

        <QuickDeclarationMapPanel
          activePointId={activePointId}
          context={context}
          declaredPointIds={declaredPointIds}
          declarantName={contactDeclarantName}
          entryPoints={entryPoints}
          focusRequestId={focusRequestId}
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
