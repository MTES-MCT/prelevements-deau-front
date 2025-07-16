/* eslint-disable camelcase */
import {useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import Button from '@codegouvfr/react-dsfr/Button'
import Input from '@codegouvfr/react-dsfr/Input'
import Select from '@codegouvfr/react-dsfr/SelectNext'
import {Typography} from '@mui/material'
import {uniqueId} from 'lodash-es'

import {emptyStringToNull} from '@/utils/string.js'

const contraintes = [
  'minimum',
  'maximum'
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
  'pH'
]

const unites = [
  {value: 'm3', label: 'm³'},
  {value: 'L/s', label: 'L/s'},
  {value: 'm3/h', label: 'm³/h'},
  {value: 'mg/L', label: 'mg/L'},
  {value: 'degré Celsius', label: 'degrès Celsius'},
  {value: 'm NGR', label: 'm NGR'},
  {value: 'µS/cm', label: 'µS/cm'}
]

const emptyRegle = {
  parametre: '',
  unite: '',
  valeur: '',
  contrainte: '',
  debut_validite: '',
  fin_validite: '',
  remarque: ''
}

const ReglesForm = ({defaultRegles, setExploitation}) => {
  const [error, setError] = useState()
  const [regles, setRegles] = useState(defaultRegles || [])
  const [regle, setRegle] = useState(emptyRegle)

  const handleRegles = () => {
    setError(null)

    if (!/^-?\d+(\.\d+)?$/.test(regle.valeur)) {
      setError('La valeur doit être un nombre (positif/négatif/entier ou non)')
      return
    }

    if (!regle.parametre || !regle.unite || !regle.valeur || !regle.contrainte || !regle.debut_validite) {
      setError('Les champs "Paramètre", "Unité", "Valeur", "Contrainte" et "Début de validité" sont requis.')
      return
    }

    regle.valeur = Number(regle.valeur)

    const newRegles = [...regles, emptyStringToNull(regle)]

    setRegles(newRegles)
    setExploitation(prev => ({...prev, regles: newRegles}))
    setRegle(emptyRegle)
  }

  const handleDeleteRegle = idx => {
    const updatedRegles = regles.filter((_, index) => index !== idx)
    setRegles(updatedRegles)
    setExploitation(prev => ({...prev, regles: updatedRegles}))
  }

  return (
    <div>
      <div className='pb-5'>
        <Typography variant='h5'>
          Règles
        </Typography>
        <p>
          <small>Ajouter des règles associées à l’exploitation</small>
        </p>
      </div>
      <Select
        label='Paramètre *'
        placeholder='Sélectionner un paramètre'
        nativeSelectProps={{
          value: regle?.parametre,
          onChange: e => setRegle(prev => ({...prev, parametre: e.target.value}))
        }}
        options={parametres.map(parametre => ({
          value: parametre,
          label: parametre
        }))}
      />
      <div className='grid grid-cols-2 gap-4'>
        <Select
          label='Unité *'
          placeholder='Sélectionner une unité'
          nativeSelectProps={{
            value: regle?.unite,
            onChange: e => setRegle(prev => ({...prev, unite: e.target.value}))
          }}
          options={unites.map(unite => ({
            value: unite.value,
            label: unite.label
          }))}
        />
        <Input
          label='Valeur *'
          nativeInputProps={{
            type: 'number',
            placeholder: 'Entrer une valeur',
            value: regle?.valeur,
            onChange: e => setRegle(prev => ({...prev, valeur: e.target.value}))
          }}
        />
      </div>
      <Select
        label='Contrainte *'
        placeholder='Sélectionner un niveau de contrainte'
        nativeSelectProps={{
          value: regle?.contrainte,
          onChange: e => setRegle(prev => ({...prev, contrainte: e.target.value}))
        }}
        options={contraintes.map(contrainte => ({
          value: contrainte,
          label: contrainte
        }))}
      />
      <div className='grid grid-cols-2 gap-4'>
        <Input
          label='Début de validité *'
          nativeInputProps={{
            type: 'date',
            value: regle?.debut_validite,
            onChange: e => setRegle(prev => ({...prev, debut_validite: e.target.value}))
          }}
        />
        <Input
          label='Fin de validité'
          nativeInputProps={{
            type: 'date',
            value: regle?.fin_validite,
            onChange: e => setRegle(prev => ({...prev, fin_validite: e.target.value}))
          }}
        />
      </div>
      <Input
        textArea
        label='Remarque'
        nativeTextAreaProps={{
          placeholder: 'Entrer une remarque',
          value: regle?.remarque,
          onChange: e => setRegle(prev => ({...prev, remarque: e.target.value}))
        }}
      />
      <div className='flex justify-end'>
        <Button onClick={handleRegles}>
          Ajouter une règle
        </Button>
      </div>
      {error && (
        <div className='text-center p-5 text-red-500'>
          <p><b>Un problème est survenu :</b></p>
          {error}
        </div>
      )}
      {regles.length > 0 && (
        <div className='pt-5'>
          <div className='border-t border-gray-200 my-8' />
          <Typography variant='h6' className='pb-5'>
            Règles ajoutées
          </Typography>
          {regles.map((regle, idx) => (
            <div
              key={uniqueId()}
              className='flex justify-between p-3'
              style={{
                backgroundColor: idx % 2 === 0
                  ? fr.colors.decisions.background.alt.blueFrance.default
                  : ''
              }}
            >
              <div className='flex flex-col'>
                <b>{regle.parametre}</b>
                <small><i>{regle.debut_validite} - {regle?.fin_validite || 'en cours'}</i></small>
              </div>
              <span><b>{regle.valeur} {regle.unite}</b></span>
              <div>
                <Button
                  iconId='fr-icon-delete-line'
                  priority='tertiary'
                  title='Delete'
                  style={{color: 'red'}}
                  onClick={() => handleDeleteRegle(idx)}
                />
              </div>
            </div>
          ))}
          <div className='border-t border-gray-200 my-5' />
        </div>
      )}
    </div>
  )
}

export default ReglesForm
