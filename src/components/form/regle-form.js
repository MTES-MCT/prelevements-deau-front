'use client'

import {useMemo} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'

import DayMonthSelector from '@/components/form/day-month-selector.js'
import DividerSection from '@/components/ui/DividerSection/index.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {formatExploitationUsages} from '@/lib/exploitation-usages.js'
import {formatFullDateFr} from '@/lib/format-date.js'
import {getConstraintLabel, getParameterInfo, parameterUnits} from '@/lib/regles.js'
import {displayPreleveur} from '@/utils/preleveurs.js'

const defaultRegle = {
  exploitationIds: [],
  documentId: null,
  parameter: '',
  unit: '',
  value: '',
  constraint: '',
  frequency: null,
  validityStartDate: '',
  validityEndDate: '',
  annualPeriodStartDate: '',
  annualPeriodEndDate: '',
  comment: ''
}

const constraints = [
  {value: 'MIN', label: 'Minimum (>)'},
  {value: 'MAX', label: 'Maximum (<)'}
]

const parameterOptions = [
  {value: '', label: '-- Sélectionner --', disabled: true},
  ...Object.entries(parameterUnits).map(([parameter, units]) => {
    const label = units.length === 1 ? `${parameter} (${units[0]})` : parameter
    return {value: parameter, label}
  })
]

const constraintOptions = [
  {value: '', label: '-- Sélectionner --', disabled: true},
  ...constraints.map(constraint => ({value: constraint.value, label: constraint.label}))
]

const statusLabels = {
  EN_ACTIVITE: 'En activité',
  TERMINEE: 'Terminée',
  ABANDONNEE: 'Abandonnée',
  NON_RENSEIGNE: 'Non renseigné'
}

function getUnitOptions(parameter) {
  const units = parameterUnits[parameter] || []

  return [
    {value: '', label: '-- Sélectionner --', disabled: true},
    ...units.map(unit => ({value: unit, label: unit}))
  ]
}

function hasUnit(parameter) {
  return (parameterUnits[parameter] || []).length > 0
}

function getExploitationLabel(exploitation) {
  const pointName = exploitation.pointPrelevement?.name || 'Point inconnu'
  const declarantName = displayPreleveur(exploitation.declarant)
  const usageText = formatExploitationUsages(exploitation)

  return `${pointName} (${declarantName}) - ${usageText}`
}

function getExploitationTooltip(exploitation) {
  const start = exploitation.startDate
    ? `Depuis le ${formatFullDateFr(exploitation.startDate)}`
    : 'Début non renseigné'

  const end = exploitation.endDate
    ? ` jusqu’au ${formatFullDateFr(exploitation.endDate)}`
    : ''

  return `${start}${end}`
}

function buildExploitationOptions(exploitations) {
  const grouped = {}

  for (const exploitation of exploitations) {
    const status = exploitation.status || 'NON_RENSEIGNE'
    grouped[status] ||= []

    const label = getExploitationLabel(exploitation)

    grouped[status].push({
      value: exploitation.id,
      content: label,
      title: label,
      tooltip: getExploitationTooltip(exploitation),
      sortKey: exploitation.pointPrelevement?.name || ''
    })
  }

  for (const options of Object.values(grouped)) {
    options.sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey, 'fr', {sensitivity: 'base'})
    )
  }

  const statusOrder = ['EN_ACTIVITE', 'TERMINEE', 'ABANDONNEE', 'NON_RENSEIGNE']

  return statusOrder
    .filter(status => grouped[status]?.length > 0)
    .map(status => ({
      label: statusLabels[status] || status,
      options: grouped[status]
    }))
}

function buildDocumentOptions(documents) {
  return [
    {value: '', label: '-- Aucun document --'},
    ...documents.map(document => ({
      value: document.id,
      label: `${document.nature}${document.reference ? ` - ${document.reference}` : ''} (${formatFullDateFr(document.signatureDate)})`
    }))
  ]
}

function getFieldError(validationErrors, field) {
  const error = validationErrors.find(error => error.path?.includes(field))
  return error?.message
}

const ParameterSection = ({regle, setRegle, fieldError}) => {
  const handleParameterChange = parameter => {
    const units = parameterUnits[parameter] || []
    const unit = units.length === 1 ? units[0] : ''

    setRegle(previous => ({
      ...previous,
      parameter,
      unit,
      frequency: parameter === 'volume' ? previous.frequency : null
    }))
  }

  const showUnitField = hasUnit(regle.parameter)
  const isVolumeParameter = regle.parameter === 'volume'
  const unitOptions = getUnitOptions(regle.parameter)

  return (
    <DividerSection title='Paramètre et valeur'>
      <Select
        label='Paramètre *'
        placeholder='Sélectionner un paramètre'
        state={fieldError('parameter') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('parameter')}
        nativeSelectProps={{
          value: regle.parameter || '',
          onChange: event => handleParameterChange(event.target.value)
        }}
        options={parameterOptions}
      />

      {isVolumeParameter && (
        <Select
          label='Fréquence *'
          placeholder='Sélectionner une fréquence'
          state={fieldError('frequency') ? 'error' : 'default'}
          stateRelatedMessage={fieldError('frequency')}
          nativeSelectProps={{
            value: regle.frequency || '',
            onChange: event => setRegle(previous => ({...previous, frequency: event.target.value}))
          }}
          options={[
            {value: '', label: '-- Sélectionner --', disabled: true},
            {value: '1 day', label: 'Journalier'},
            {value: '1 month', label: 'Mensuel'},
            {value: '1 year', label: 'Annuel'}
          ]}
        />
      )}

      <div className={showUnitField ? 'grid grid-cols-2 gap-4' : ''}>
        {showUnitField && (
          <Select
            label='Unité *'
            placeholder='Sélectionner une unité'
            state={fieldError('unit') ? 'error' : 'default'}
            stateRelatedMessage={fieldError('unit')}
            nativeSelectProps={{
              value: regle.unit || '',
              onChange: event => setRegle(previous => ({...previous, unit: event.target.value}))
            }}
            options={unitOptions}
          />
        )}

        <Input
          label='Valeur *'
          state={fieldError('value') ? 'error' : 'default'}
          stateRelatedMessage={fieldError('value')}
          nativeInputProps={{
            type: 'number',
            step: 'any',
            min: 0,
            placeholder: 'Entrer une valeur',
            value: regle.value ?? '',
            onChange: event => setRegle(previous => ({...previous, value: event.target.value}))
          }}
        />
      </div>

      <Select
        label='Contrainte *'
        placeholder='Sélectionner un niveau de contrainte'
        state={fieldError('constraint') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('constraint')}
        nativeSelectProps={{
          value: regle.constraint || '',
          onChange: event => setRegle(previous => ({...previous, constraint: event.target.value}))
        }}
        options={constraintOptions}
      />
    </DividerSection>
  )
}

const PeriodSection = ({regle, setRegle, fieldError}) => (
  <DividerSection title='Période de validité'>
    <div className='grid grid-cols-2 gap-4'>
      <Input
        label='Début de validité *'
        hintText="Date de début d'application de la règle"
        state={fieldError('validityStartDate') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('validityStartDate')}
        nativeInputProps={{
          type: 'date',
          value: regle.validityStartDate || '',
          onChange: event => setRegle(previous => ({...previous, validityStartDate: event.target.value}))
        }}
      />
      <Input
        label='Fin de validité'
        hintText='Laisser vide si la règle est toujours en vigueur'
        state={fieldError('validityEndDate') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('validityEndDate')}
        nativeInputProps={{
          type: 'date',
          value: regle.validityEndDate || '',
          onChange: event => setRegle(previous => ({...previous, validityEndDate: event.target.value}))
        }}
      />
    </div>

    <div className='grid grid-cols-2 gap-4'>
      <DayMonthSelector
        label='Début de période'
        toolTip="Début de la période annuelle durant laquelle s'applique la règle"
        defaultValue={regle.annualPeriodStartDate}
        onChange={date => setRegle(previous => ({...previous, annualPeriodStartDate: date}))}
      />
      <DayMonthSelector
        label='Fin de période'
        toolTip="Fin de la période annuelle durant laquelle s'applique la règle"
        defaultValue={regle.annualPeriodEndDate}
        onChange={date => setRegle(previous => ({...previous, annualPeriodEndDate: date}))}
      />
    </div>
  </DividerSection>
)

const RegleForm = ({
  regle = defaultRegle,
  setRegle,
  exploitations = [],
  documents = [],
  validationErrors = []
}) => {
  const hasNoExploitations = exploitations.length === 0

  if (hasNoExploitations) {
    return (
      <Alert
        severity='warning'
        title='Aucune exploitation disponible'
        description="Vous devez d'abord créer une exploitation pour ce déclarant avant de pouvoir ajouter une règle. Une règle doit obligatoirement être associée à au moins une exploitation."
      />
    )
  }

  return (
    <RegleFormFields
      documents={documents}
      exploitations={exploitations}
      regle={{...defaultRegle, ...regle}}
      setRegle={setRegle}
      validationErrors={validationErrors}
    />
  )
}

const RegleFormFields = ({
  regle = defaultRegle,
  setRegle,
  exploitations = [],
  documents = [],
  validationErrors = []
}) => {
  const safeRegle = {...defaultRegle, ...regle}
  const fieldError = field => getFieldError(validationErrors, field)

  const exploitationOptions = useMemo(
    () => buildExploitationOptions(exploitations),
    [exploitations]
  )

  const documentOptions = useMemo(
    () => buildDocumentOptions(documents),
    [documents]
  )

  return (
    <div className='flex flex-col gap-4'>
      <div className={fieldError('exploitationIds') ? 'fr-input-group--error' : ''}>
        <GroupedMultiselect
          searchable
          label='Exploitations associées *'
          hint="Sélectionnez au moins une exploitation à laquelle cette règle s'applique"
          placeholder='Sélectionner des exploitations'
          options={exploitationOptions}
          value={safeRegle.exploitationIds || []}
          onChange={exploitationIds => setRegle(previous => ({...previous, exploitationIds}))}
        />
        {fieldError('exploitationIds') && (
          <p className='fr-error-text'>{fieldError('exploitationIds')}</p>
        )}
      </div>

      <Select
        label='Document associé'
        hint='Document administratif dont est issue la règle (optionnel)'
        placeholder='Sélectionner un document'
        state={fieldError('documentId') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('documentId')}
        nativeSelectProps={{
          value: safeRegle.documentId || '',
          onChange: event => setRegle(previous => ({...previous, documentId: event.target.value || null}))
        }}
        options={documentOptions}
      />

      <ParameterSection fieldError={fieldError} regle={safeRegle} setRegle={setRegle} />

      <PeriodSection fieldError={fieldError} regle={safeRegle} setRegle={setRegle} />

      <Input
        textArea
        label='Commentaire'
        state={fieldError('comment') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('comment')}
        nativeTextAreaProps={{
          placeholder: 'Commentaire ou précision sur cette règle',
          value: safeRegle.comment || '',
          onChange: event => setRegle(previous => ({...previous, comment: event.target.value}))
        }}
      />

      <input readOnly type='hidden' value={getConstraintLabel(safeRegle.constraint) || getParameterInfo(safeRegle.parameter, safeRegle.frequency)?.label || ''} />
    </div>
  )
}

export default RegleForm
