/* eslint-disable camelcase */
'use client'

import {useMemo} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'

import DayMonthSelector from '@/components/form/day-month-selector.js'
import DividerSection from '@/components/ui/DividerSection/index.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {formatFullDateFr} from '@/lib/format-date.js'

const contraintes = [
  {value: 'min', label: 'Minimum (>)'},
  {value: 'max', label: 'Maximum (<)'}
]

// Mapping of parameters to their valid units
const parametreUnites = {
  'volume prélevé': ['m³'],
  'relevé d\'index': ['m³'],
  'débit prélevé': ['L/s', 'm³/h'],
  'débit réservé': ['L/s', 'm³/h'],
  chlorures: ['mg/L'],
  nitrates: ['mg/L'],
  sulfates: ['mg/L'],
  température: ['degrés Celsius'],
  'niveau piézométrique': ['m NGR'],
  conductivité: ['µS/cm'],
  pH: []
}

// Build parameter options with unit in label when there's only one unit
const parametreOptions = [
  {value: '', label: '-- Sélectionner --', disabled: true},
  ...Object.entries(parametreUnites).map(([parametre, unites]) => {
    // Show unit in label only if there's exactly one unit
    const label = unites.length === 1 ? `${parametre} (${unites[0]})` : parametre
    return {value: parametre, label}
  })
]

// Unit options for parameters with multiple units (Débit prélevé, Débit réservé)
const uniteOptions = [
  {value: '', label: '-- Sélectionner --', disabled: true},
  {value: 'L/s', label: 'L/s'},
  {value: 'm³/h', label: 'm³/h'}
]

// Check if a parameter requires unit selection (has multiple units)
const requiresUniteSelection = parametre => (parametreUnites[parametre]?.length || 0) > 1

const contrainteOptions = [
  {value: '', label: '-- Sélectionner --', disabled: true},
  ...contraintes.map(c => ({value: c.value, label: c.label}))
]

// Build a map from exploitation ID to display label
const buildExploitationLabelsMap = exploitations => {
  const map = {}
  for (const exploitation of exploitations) {
    const pointName = exploitation.point?.nom || exploitation.point?.id_point || 'Point inconnu'
    const usagesText = exploitation.usages?.join(', ') || 'Usage non renseigné'
    map[exploitation._id] = `${pointName} - ${usagesText}`
  }

  return map
}

// Build reverse map from label to ID
const buildIdByLabelMap = labelsById => {
  const idByLabel = {}
  for (const [id, label] of Object.entries(labelsById)) {
    idByLabel[label] = id
  }

  return idByLabel
}

// Group exploitations by statut for the multiselect
// Uses the display label as value since GroupedMultiselect displays values directly
const buildExploitationOptions = (exploitations, labelsById) => {
  const statutOrder = ['En activité', 'Terminée', 'Abandonnée', 'Non renseigné']
  const grouped = {}

  for (const exploitation of exploitations) {
    const statut = exploitation.statut || 'Non renseigné'
    grouped[statut] ||= []

    const label = labelsById[exploitation._id]
    const dateText = `Depuis le ${formatFullDateFr(exploitation.date_debut)}${exploitation.date_fin ? ` jusqu'au ${formatFullDateFr(exploitation.date_fin)}` : ''}`

    grouped[statut].push({
      value: label,
      content: label,
      title: dateText
    })
  }

  // Return groups in order, filtering out empty groups
  return statutOrder
    .filter(statut => grouped[statut]?.length > 0)
    .map(statut => ({
      label: statut,
      options: grouped[statut]
    }))
}

// Build document options for the select
const buildDocumentOptions = documents => [
  {value: '', label: '-- Aucun document --'},
  ...documents.map(doc => ({
    value: doc._id,
    label: `${doc.nature}${doc.reference ? ` - ${doc.reference}` : ''} (${formatFullDateFr(doc.date_signature)})`
  }))
]

// Get validation error message for a specific field
const getFieldError = (validationErrors, field) => {
  const error = validationErrors.find(e => e.path?.includes(field))
  return error?.message
}

// Parametre and value section component
const ParametreSection = ({regle, setRegle, fieldError}) => {
  // Handle parameter change - auto-select unit if only one valid option
  const handleParametreChange = newParametre => {
    const validUnites = parametreUnites[newParametre] || []
    const newUnite = validUnites.length === 1 ? validUnites[0] : ''

    setRegle(prev => ({
      ...prev,
      parametre: newParametre,
      unite: newUnite
    }))
  }

  const showUniteField = requiresUniteSelection(regle.parametre)
  const isVolumePreleveParametre = regle.parametre === 'volume prélevé'

  return (
    <DividerSection title='Paramètre et valeur'>
      <Select
        label='Paramètre *'
        placeholder='Sélectionner un paramètre'
        state={fieldError('parametre') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('parametre')}
        nativeSelectProps={{
          value: regle.parametre || '',
          onChange: e => handleParametreChange(e.target.value)
        }}
        options={parametreOptions}
      />

      {isVolumePreleveParametre && (
        <Select
          label='Fréquence *'
          placeholder='Sélectionner une fréquence'
          state={fieldError('frequence') ? 'error' : 'default'}
          stateRelatedMessage={fieldError('frequence')}
          nativeSelectProps={{
            value: regle.frequence || '',
            onChange: e => setRegle(prev => ({...prev, frequence: e.target.value}))
          }}
          options={[
            {value: '', label: '-- Sélectionner --', disabled: true},
            {value: '1 day', label: 'Journalier'},
            {value: '1 month', label: 'Mensuel'},
            {value: '1 year', label: 'Annuel'}
          ]}
        />
      )}

      <div className={showUniteField ? 'grid grid-cols-2 gap-4' : ''}>
        {showUniteField && (
          <Select
            label='Unité *'
            placeholder='Sélectionner une unité'
            state={fieldError('unite') ? 'error' : 'default'}
            stateRelatedMessage={fieldError('unite')}
            nativeSelectProps={{
              value: regle.unite || '',
              onChange: e => setRegle(prev => ({...prev, unite: e.target.value}))
            }}
            options={uniteOptions}
          />
        )}
        <Input
          label='Valeur *'
          state={fieldError('valeur') ? 'error' : 'default'}
          stateRelatedMessage={fieldError('valeur')}
          nativeInputProps={{
            type: 'number',
            step: 'any',
            min: 0,
            placeholder: 'Entrer une valeur',
            value: regle.valeur ?? '',
            onChange: e => setRegle(prev => ({...prev, valeur: e.target.value}))
          }}
        />
      </div>

      <Select
        label='Contrainte *'
        placeholder='Sélectionner un niveau de contrainte'
        state={fieldError('contrainte') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('contrainte')}
        nativeSelectProps={{
          value: regle.contrainte || '',
          onChange: e => setRegle(prev => ({...prev, contrainte: e.target.value}))
        }}
        options={contrainteOptions}
      />
    </DividerSection>
  )
}

// Period section component
const PeriodeSection = ({regle, setRegle, fieldError}) => (
  <DividerSection title='Période de validité'>
    <div className='grid grid-cols-2 gap-4'>
      <Input
        label='Début de validité *'
        hintText="Date de début d'application de la règle"
        state={fieldError('debut_validite') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('debut_validite')}
        nativeInputProps={{
          type: 'date',
          value: regle.debut_validite || '',
          onChange: e => setRegle(prev => ({...prev, debut_validite: e.target.value}))
        }}
      />
      <Input
        label='Fin de validité'
        hintText='Laisser vide si la règle est toujours en vigueur'
        state={fieldError('fin_validite') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('fin_validite')}
        nativeInputProps={{
          type: 'date',
          value: regle.fin_validite || '',
          onChange: e => setRegle(prev => ({...prev, fin_validite: e.target.value}))
        }}
      />
    </div>

    <div className='grid grid-cols-2 gap-4'>
      <DayMonthSelector
        label='Début de période'
        toolTip="Début de la période annuelle durant laquelle s'applique la règle (par exemple 01/05 pour une règle saisonnière débutant le 1er mai)"
        defaultValue={regle.debut_periode}
        onChange={date => setRegle(prev => ({...prev, debut_periode: date}))}
      />
      <DayMonthSelector
        label='Fin de période'
        toolTip="Fin de la période annuelle durant laquelle s'applique la règle (par exemple 30/09 pour une règle cessant le 30 septembre)"
        defaultValue={regle.fin_periode}
        onChange={date => setRegle(prev => ({...prev, fin_periode: date}))}
      />
    </div>
  </DividerSection>
)

/**
 * Reusable form component for creating/editing a regle
 * @param {Object} regle - Current regle state
 * @param {Function} setRegle - Function to update regle state
 * @param {Array} exploitations - Available exploitations for the preleveur
 * @param {Array} documents - Available documents for the preleveur
 * @param {Array} validationErrors - Validation errors from API
 */
const RegleForm = ({regle, setRegle, exploitations, documents, validationErrors = []}) => {
  const hasNoExploitations = !exploitations || exploitations.length === 0

  // Early return before any hooks if no exploitations
  if (hasNoExploitations) {
    return (
      <Alert
        severity='warning'
        title='Aucune exploitation disponible'
        description="Vous devez d'abord créer une exploitation pour ce préleveur avant de pouvoir ajouter une règle. Une règle doit obligatoirement être associée à au moins une exploitation."
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

  // Build ID <-> label mappings
  const exploitationLabelsById = useMemo(
    () => buildExploitationLabelsMap(exploitations || []),
    [exploitations]
  )

  const idByLabel = useMemo(
    () => buildIdByLabelMap(exploitationLabelsById),
    [exploitationLabelsById]
  )

  // Build options using labels as values (for display in GroupedMultiselect)
  const exploitationOptions = useMemo(
    () => buildExploitationOptions(exploitations || [], exploitationLabelsById),
    [exploitations, exploitationLabelsById]
  )

  const documentOptions = useMemo(
    () => buildDocumentOptions(documents || []),
    [documents]
  )

  // Convert selected IDs to display labels for the multiselect
  const selectedLabels = useMemo(() =>
    (regle.exploitations || []).map(id => exploitationLabelsById[id] || id),
  [regle.exploitations, exploitationLabelsById])

  // Handle selection change - convert labels back to IDs
  const handleExploitationsChange = newLabels => {
    const newIds = newLabels.map(label => idByLabel[label] || label)
    setRegle(prev => ({...prev, exploitations: newIds}))
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className={fieldError('exploitations') ? 'fr-input-group--error' : ''}>
        <GroupedMultiselect
          label='Exploitations associées *'
          hint="Sélectionnez au moins une exploitation à laquelle cette règle s'applique"
          placeholder='Sélectionner des exploitations'
          options={exploitationOptions}
          value={selectedLabels}
          onChange={handleExploitationsChange}
        />
        {fieldError('exploitations') && (
          <p className='fr-error-text'>{fieldError('exploitations')}</p>
        )}
      </div>

      <Select
        label='Document associé'
        hint='Document administratif dont est issue la règle (optionnel)'
        placeholder='Sélectionner un document'
        state={fieldError('document') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('document')}
        nativeSelectProps={{
          value: regle.document || '',
          onChange: e => setRegle(prev => ({...prev, document: e.target.value || null}))
        }}
        options={documentOptions}
      />

      <ParametreSection fieldError={fieldError} regle={regle} setRegle={setRegle} />

      <PeriodeSection fieldError={fieldError} regle={regle} setRegle={setRegle} />

      <Input
        textArea
        label='Remarque'
        state={fieldError('remarque') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('remarque')}
        nativeTextAreaProps={{
          placeholder: 'Commentaire ou précision sur cette règle',
          value: regle.remarque || '',
          onChange: e => setRegle(prev => ({...prev, remarque: e.target.value}))
        }}
      />
    </div>
  )
}

export default RegleForm
