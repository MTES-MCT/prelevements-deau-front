/* eslint-disable camelcase */
'use client'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'
import {Tooltip} from '@codegouvfr/react-dsfr/Tooltip'
import dynamic from 'next/dynamic'

import DayMonthSelector from '@/components/form/day-month-selector.js'
import {formatFullDateFr} from '@/lib/format-date.js'

const DynamicCheckbox = dynamic(
  () => import('@codegouvfr/react-dsfr/Checkbox'),
  {ssr: false}
)

const contraintes = [
  {value: 'minimum', label: 'Minimum (>)'},
  {value: 'maximum', label: 'Maximum (<)'},
  {value: 'moyenne', label: 'Moyenne (≃)'}
]

const parametres = [
  'Volume journalier',
  'Volume mensuel',
  'Volume annuel',
  'Débit prélevé',
  'Débit réservé',
  'Chlorures',
  'Nitrates',
  'Sulfates',
  'Température',
  'Niveau piézométrique',
  'Conductivité électrique',
  'pH',
  'Turbidité'
]

const unites = [
  {value: 'm3', label: 'm³'},
  {value: 'L/s', label: 'L/s'},
  {value: 'm3/h', label: 'm³/h'},
  {value: 'mg/L', label: 'mg/L'},
  {value: 'degré Celsius', label: 'degrés Celsius'},
  {value: 'm NGR', label: 'm NGR'},
  {value: 'µS/cm', label: 'µS/cm'},
  {value: 'NTU', label: 'NTU'}
]

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

  const getFieldError = field => {
    const error = validationErrors.find(e => e.path?.includes(field))
    return error?.message
  }

  const handleExploitationChange = (exploitationId, checked) => {
    setRegle(prev => {
      const currentExploitations = prev.exploitations || []
      if (checked) {
        return {...prev, exploitations: [...currentExploitations, exploitationId]}
      }

      return {...prev, exploitations: currentExploitations.filter(id => id !== exploitationId)}
    })
  }

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
    <div className='flex flex-col gap-4'>
      <DynamicCheckbox
        legend='Exploitations associées *'
        hintText="Sélectionnez au moins une exploitation à laquelle cette règle s'applique"
        state={getFieldError('exploitations') ? 'error' : 'default'}
        stateRelatedMessage={getFieldError('exploitations')}
        options={exploitations.map(exploitation => ({
          label: `${exploitation.point?.nom || exploitation.point?.id_point || 'Point inconnu'} - ${exploitation.usages?.join(', ') || 'Usage non renseigné'}`,
          hintText: `Depuis le ${formatFullDateFr(exploitation.date_debut)}${exploitation.date_fin ? ` jusqu'au ${formatFullDateFr(exploitation.date_fin)}` : ''}`,
          nativeInputProps: {
            checked: regle.exploitations?.includes(exploitation._id),
            onChange: e => handleExploitationChange(exploitation._id, e.target.checked)
          }
        }))}
      />

      <Select
        label='Document associé'
        hint='Document administratif dont est issue la règle (optionnel)'
        placeholder='Sélectionner un document'
        state={getFieldError('document') ? 'error' : 'default'}
        stateRelatedMessage={getFieldError('document')}
        nativeSelectProps={{
          value: regle.document || '',
          onChange: e => setRegle(prev => ({...prev, document: e.target.value || null}))
        }}
        options={[
          {value: '', label: '-- Aucun document --'},
          ...documents.map(doc => ({
            value: doc._id,
            label: `${doc.nature}${doc.reference ? ` - ${doc.reference}` : ''} (${formatFullDateFr(doc.date_signature)})`
          }))
        ]}
      />

      <Select
        label='Paramètre *'
        placeholder='Sélectionner un paramètre'
        state={getFieldError('parametre') ? 'error' : 'default'}
        stateRelatedMessage={getFieldError('parametre')}
        nativeSelectProps={{
          value: regle.parametre || '',
          onChange: e => setRegle(prev => ({...prev, parametre: e.target.value}))
        }}
        options={[
          {value: '', label: '-- Sélectionner --', disabled: true},
          ...parametres.map(parametre => ({
            value: parametre,
            label: parametre
          }))
        ]}
      />

      <div className='grid grid-cols-2 gap-4'>
        <Select
          label='Unité *'
          placeholder='Sélectionner une unité'
          state={getFieldError('unite') ? 'error' : 'default'}
          stateRelatedMessage={getFieldError('unite')}
          nativeSelectProps={{
            value: regle.unite || '',
            onChange: e => setRegle(prev => ({...prev, unite: e.target.value}))
          }}
          options={[
            {value: '', label: '-- Sélectionner --', disabled: true},
            ...unites.map(unite => ({
              value: unite.value,
              label: unite.label
            }))
          ]}
        />
        <Input
          label='Valeur *'
          state={getFieldError('valeur') ? 'error' : 'default'}
          stateRelatedMessage={getFieldError('valeur')}
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
        state={getFieldError('contrainte') ? 'error' : 'default'}
        stateRelatedMessage={getFieldError('contrainte')}
        nativeSelectProps={{
          value: regle.contrainte || '',
          onChange: e => setRegle(prev => ({...prev, contrainte: e.target.value}))
        }}
        options={[
          {value: '', label: '-- Sélectionner --', disabled: true},
          ...contraintes.map(contrainte => ({
            value: contrainte.value,
            label: contrainte.label
          }))
        ]}
      />

      <div className='grid grid-cols-2 gap-4'>
        <Input
          label='Début de validité *'
          hintText={
            <>
              <span className='pr-2'>Date de début d&apos;application de la règle</span>
              <Tooltip kind='hover' title='En général, la date du document dont est issue la règle' />
            </>
          }
          state={getFieldError('debut_validite') ? 'error' : 'default'}
          stateRelatedMessage={getFieldError('debut_validite')}
          nativeInputProps={{
            type: 'date',
            value: regle.debut_validite || '',
            onChange: e => setRegle(prev => ({...prev, debut_validite: e.target.value}))
          }}
        />
        <Input
          label='Fin de validité'
          hintText={
            <>
              <span className='pr-2'>Date de fin d&apos;application de la règle</span>
              <Tooltip
                kind='hover'
                title='Laisser vide si la règle est toujours en vigueur'
              />
            </>
          }
          state={getFieldError('fin_validite') ? 'error' : 'default'}
          stateRelatedMessage={getFieldError('fin_validite')}
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
        state={getFieldError('remarque') ? 'error' : 'default'}
        stateRelatedMessage={getFieldError('remarque')}
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
