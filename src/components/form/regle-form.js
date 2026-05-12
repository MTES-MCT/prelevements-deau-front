'use client'

import {useMemo} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'

import DayMonthSelector from '@/components/form/day-month-selector.js'
import DividerSection from '@/components/ui/DividerSection/index.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {formatFullDateFr} from '@/lib/format-date.js'
import {getConstraintLabel, getParameterInfo, parameterUnits} from '@/lib/regles.js'

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

const unitOptions = [
  {value: '', label: '-- Sélectionner --', disabled: true},
  {value: 'L/s', label: 'L/s'},
  {value: 'm³/h', label: 'm³/h'}
]

const requiresUnitSelection = parameter => (parameterUnits[parameter]?.length || 0) > 1

const constraintOptions = [
  {value: '', label: '-- Sélectionner --', disabled: true},
  ...constraints.map(constraint => ({value: constraint.value, label: constraint.label}))
]

const buildExploitationLabelsMap = exploitations => {
  const map = {}

  for (const exploitation of exploitations) {
    const pointName = exploitation.point?.name || exploitation.pointPrelevement?.name || 'Point inconnu'
    const usagesText = exploitation.usages?.join(', ') || 'Usage non renseigné'
    map[exploitation.id] = `${pointName} - ${usagesText}`
  }

  return map
}

const buildIdByLabelMap = labelsById => Object.fromEntries(
  Object.entries(labelsById).map(([id, label]) => [label, id])
)

const buildExploitationOptions = (exploitations, labelsById) => {
  const statusOrder = ['EN_ACTIVITE', 'TERMINEE', 'ABANDONNEE', 'NON_RENSEIGNE']
  const statusLabels = {
    EN_ACTIVITE: 'En activité',
    TERMINEE: 'Terminée',
    ABANDONNEE: 'Abandonnée',
    NON_RENSEIGNE: 'Non renseigné'
  }
  const grouped = {}

  for (const exploitation of exploitations) {
    const status = exploitation.status || 'NON_RENSEIGNE'
    grouped[status] ||= []

    const label = labelsById[exploitation.id]
    const dateText = `Depuis le ${formatFullDateFr(exploitation.startDate)}${exploitation.endDate ? ` jusqu'au ${formatFullDateFr(exploitation.endDate)}` : ''}`

    grouped[status].push({
      value: label,
      content: label,
      title: dateText
    })
  }

  return statusOrder
    .filter(status => grouped[status]?.length > 0)
    .map(status => ({
      label: statusLabels[status] || status,
      options: grouped[status]
    }))
}

const buildDocumentOptions = documents => [
  {value: '', label: '-- Aucun document --'},
  ...documents.map(document => ({
    value: document.id,
    label: `${document.nature}${document.reference ? ` - ${document.reference}` : ''} (${formatFullDateFr(document.signatureDate)})`
  }))
]

const getFieldError = (validationErrors, field) => {
  const error = validationErrors.find(error => error.path?.includes(field))
  return error?.message
}

const ParameterSection = ({regle, setRegle, fieldError}) => {
  const handleParameterChange = parameter => {
    const validUnits = parameterUnits[parameter] || []
    const unit = validUnits.length === 1 ? validUnits[0] : ''

    setRegle(previous => ({
      ...previous,
      parameter,
      unit
    }))
  }

  const showUnitField = requiresUnitSelection(regle.parameter)
  const isVolumeParameter = regle.parameter === 'volume prélevé'

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

const RegleForm = ({regle, setRegle, exploitations, documents, validationErrors = []}) => {
  const hasNoExploitations = !exploitations || exploitations.length === 0

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
      regle={regle}
      setRegle={setRegle}
      validationErrors={validationErrors}
    />
  )
}

const RegleFormFields = ({regle, setRegle, exploitations, documents, validationErrors}) => {
  const fieldError = field => getFieldError(validationErrors, field)

  const exploitationLabelsById = useMemo(
    () => buildExploitationLabelsMap(exploitations || []),
    [exploitations]
  )

  const idByLabel = useMemo(
    () => buildIdByLabelMap(exploitationLabelsById),
    [exploitationLabelsById]
  )

  const exploitationOptions = useMemo(
    () => buildExploitationOptions(exploitations || [], exploitationLabelsById),
    [exploitations, exploitationLabelsById]
  )

  const documentOptions = useMemo(
    () => buildDocumentOptions(documents || []),
    [documents]
  )

  const selectedLabels = useMemo(() =>
    (regle.exploitationIds || []).map(id => exploitationLabelsById[id] || id),
  [regle.exploitationIds, exploitationLabelsById])

  const handleExploitationsChange = newLabels => {
    const exploitationIds = newLabels.map(label => idByLabel[label] || label)
    setRegle(previous => ({...previous, exploitationIds}))
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className={fieldError('exploitationIds') ? 'fr-input-group--error' : ''}>
        <GroupedMultiselect
          label='Exploitations associées *'
          hint="Sélectionnez au moins une exploitation à laquelle cette règle s'applique"
          placeholder='Sélectionner des exploitations'
          options={exploitationOptions}
          value={selectedLabels}
          onChange={handleExploitationsChange}
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
          value: regle.documentId || '',
          onChange: event => setRegle(previous => ({...previous, documentId: event.target.value || null}))
        }}
        options={documentOptions}
      />

      <ParameterSection fieldError={fieldError} regle={regle} setRegle={setRegle} />

      <PeriodSection fieldError={fieldError} regle={regle} setRegle={setRegle} />

      <Input
        textArea
        label='Commentaire'
        state={fieldError('comment') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('comment')}
        nativeTextAreaProps={{
          placeholder: 'Commentaire ou précision sur cette règle',
          value: regle.comment || '',
          onChange: event => setRegle(previous => ({...previous, comment: event.target.value}))
        }}
      />

      <input readOnly type='hidden' value={getConstraintLabel(regle.constraint) || getParameterInfo(regle.parameter, regle.frequency)?.label || ''} />
    </div>
  )
}

export default RegleForm
