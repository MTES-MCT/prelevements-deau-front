/* eslint-disable camelcase */
'use client'

import {useMemo} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'

import DayMonthSelector from '@/components/form/day-month-selector.js'
import GroupedMultiselect from '@/components/ui/GroupedMultiselect/index.js'
import {formatFullDateFr} from '@/lib/format-date.js'

const contraintes = [
  {value: 'minimum', label: 'Minimum (>)'},
  {value: 'maximum', label: 'Maximum (<)'},
  {value: 'moyenne', label: 'Moyenne (≃)'}
]

const parametres = [
  'Volume journalier',
  'Volume mensuel',
  'Volume annuel',
  'Relevé d\'index',
  'Débit prélevé',
  'Débit réservé',
  'Chlorures',
  'Nitrates',
  'Sulfates',
  'Température',
  'Niveau piézométrique',
  'Conductivité électrique',
  'pH'
]

const unites = [
  {value: 'm³', label: 'm³'},
  {value: 'L/s', label: 'L/s'},
  {value: 'm³/h', label: 'm³/h'},
  {value: 'mg/L', label: 'mg/L'},
  {value: 'degré Celsius', label: 'degré Celsius'},
  {value: 'm NGR', label: 'm NGR'},
  {value: 'µS/cm', label: 'µS/cm'}
]

const parametreOptions = [
  {value: '', label: '-- Sélectionner --', disabled: true},
  ...parametres.map(p => ({value: p, label: p}))
]

const uniteOptions = [
  {value: '', label: '-- Sélectionner --', disabled: true},
  ...unites.map(u => ({value: u.value, label: u.label}))
]

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

// Group exploitations by statut for the multiselect
const buildExploitationOptions = exploitations => {
  const statutOrder = ['En activité', 'Terminée', 'Abandonnée', 'Non renseigné']
  const grouped = {}

  for (const exploitation of exploitations) {
    const statut = exploitation.statut || 'Non renseigné'
    grouped[statut] ||= []

    const pointName = exploitation.point?.nom || exploitation.point?.id_point || 'Point inconnu'
    const usagesText = exploitation.usages?.join(', ') || 'Usage non renseigné'
    const dateText = `Depuis le ${formatFullDateFr(exploitation.date_debut)}${exploitation.date_fin ? ` jusqu'au ${formatFullDateFr(exploitation.date_fin)}` : ''}`

    grouped[statut].push({
      value: exploitation._id,
      content: `${pointName} - ${usagesText}`,
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

// Build reverse map from label to ID and convert labels to IDs
const convertLabelsToIds = (newLabels, labelsById) => {
  const idByLabel = {}
  for (const [id, label] of Object.entries(labelsById)) {
    idByLabel[label] = id
  }

  return newLabels.map(label => idByLabel[label] || label)
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

  const exploitationLabelsById = useMemo(
    () => buildExploitationLabelsMap(exploitations || []),
    [exploitations]
  )

  const exploitationOptions = useMemo(
    () => buildExploitationOptions(exploitations || []),
    [exploitations]
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
    const newIds = convertLabelsToIds(newLabels, exploitationLabelsById)
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

      <Select
        label='Paramètre *'
        placeholder='Sélectionner un paramètre'
        state={fieldError('parametre') ? 'error' : 'default'}
        stateRelatedMessage={fieldError('parametre')}
        nativeSelectProps={{
          value: regle.parametre || '',
          onChange: e => setRegle(prev => ({...prev, parametre: e.target.value}))
        }}
        options={parametreOptions}
      />

      <div className='grid grid-cols-2 gap-4'>
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
