/* eslint-disable camelcase */
import {useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/SelectNext'
import {Typography} from '@mui/material'
import {uniqueId} from 'lodash-es'

import {emptyStringToNull} from '@/utils/string.js'

const frequences = {
  1: 'seconde',
  2: 'minute',
  3: '15 minutes',
  4: 'heure',
  5: 'jour',
  6: 'semaine',
  7: 'mois',
  8: 'trimestre',
  9: 'année',
  10: 'autre'
}

const frequenceOptions = Object.values(frequences).map(value => ({
  value,
  label: value
}))

const emptyModalite = {
  freq_debit_preleve: '',
  freq_debit_reserve: '',
  freq_volume_preleve: '',
  freq_niveau_eau: '',
  freq_chlorures: '',
  freq_conductivite: '',
  freq_nitrates: '',
  freq_ph: '',
  freq_sulfates: '',
  freq_temperature: '',
  freq_turbidite: '',
  remarque: ''
}

const ModalitesForm = ({defaultModalites, setExploitation}) => {
  const [error, setError] = useState()
  const [modalites, setModalites] = useState(defaultModalites || [])
  const [modalite, setModalite] = useState(emptyModalite)

  const handleModalites = () => {
    setError(null)

    const hasAtLeastOneField = Object.entries(modalite).some(([key, value]) => {
      if (key === 'remarque') {
        return false
      }

      return value && value.trim() !== ''
    })

    if (!hasAtLeastOneField) {
      setError('Au moins un champ de fréquence doit être renseigné.')
      return
    }

    const newModalites = [...modalites, emptyStringToNull(modalite)]

    setModalites(newModalites)
    setExploitation(prev => ({...prev, modalites: newModalites}))
    setModalite(emptyModalite)
  }

  const handleDeleteModalite = idx => {
    const updatedModalites = modalites.filter((_, index) => index !== idx)
    setModalites(updatedModalites)
    setExploitation(prev => ({...prev, modalites: updatedModalites}))
  }

  return (
    <div>
      <div className='pb-5'>
        <Typography variant='h5'>
          Modalités
        </Typography>
        <p>
          <small>Ajouter des modalités de suivi associées à l’exploitation</small>
        </p>
      </div>
      <div className='grid grid-cols-2 gap-4'>
        <Select
          label='Débit prélevé'
          placeholder='Sélectionner une fréquence'
          nativeSelectProps={{
            value: modalite?.freq_debit_preleve,
            onChange: e => setModalite(prev => ({...prev, freq_debit_preleve: e.target.value}))
          }}
          options={frequenceOptions}
        />
        <Select
          label='Débit réservé'
          placeholder='Sélectionner une fréquence'
          nativeSelectProps={{
            value: modalite?.freq_debit_reserve,
            onChange: e => setModalite(prev => ({...prev, freq_debit_reserve: e.target.value}))
          }}
          options={frequenceOptions}
        />
      </div>
      <div className='grid grid-cols-2 gap-4'>
        <Select
          label='Volume prélevé'
          placeholder='Sélectionner une fréquence'
          nativeSelectProps={{
            value: modalite?.freq_volume_preleve,
            onChange: e => setModalite(prev => ({...prev, freq_volume_preleve: e.target.value}))
          }}
          options={frequenceOptions}
        />
        <Select
          label='Niveau Eau'
          placeholder='Sélectionner une fréquence'
          nativeSelectProps={{
            value: modalite?.freq_niveau_eau,
            onChange: e => setModalite(prev => ({...prev, freq_niveau_eau: e.target.value}))
          }}
          options={frequenceOptions}
        />
      </div>
      <div className='grid grid-cols-2 gap-4'>
        <Select
          label='Chlorures'
          placeholder='Sélectionner une fréquence'
          nativeSelectProps={{
            value: modalite?.freq_chlorures,
            onChange: e => setModalite(prev => ({...prev, freq_chlorures: e.target.value}))
          }}
          options={frequenceOptions}
        />
        <Select
          label='Conductivité'
          placeholder='Sélectionner une fréquence'
          nativeSelectProps={{
            value: modalite?.freq_conductivite,
            onChange: e => setModalite(prev => ({...prev, freq_conductivite: e.target.value}))
          }}
          options={frequenceOptions}
        />
      </div>
      <div className='grid grid-cols-2 gap-4'>
        <Select
          label='Nitrates'
          placeholder='Sélectionner une fréquence'
          nativeSelectProps={{
            value: modalite?.freq_nitrates,
            onChange: e => setModalite(prev => ({...prev, freq_nitrates: e.target.value}))
          }}
          options={frequenceOptions}
        />
        <Select
          label='PH'
          placeholder='Sélectionner une fréquence'
          nativeSelectProps={{
            value: modalite?.freq_ph,
            onChange: e => setModalite(prev => ({...prev, freq_ph: e.target.value}))
          }}
          options={frequenceOptions}
        />
      </div>
      <div className='grid grid-cols-2 gap-4'>
        <Select
          label='Sulfates'
          placeholder='Sélectionner une fréquence'
          nativeSelectProps={{
            value: modalite?.freq_sulfates,
            onChange: e => setModalite(prev => ({...prev, freq_sulfates: e.target.value}))
          }}
          options={frequenceOptions}
        />
        <Select
          label='Température'
          placeholder='Sélectionner une fréquence'
          nativeSelectProps={{
            value: modalite?.freq_temperature,
            onChange: e => setModalite(prev => ({...prev, freq_temperature: e.target.value}))
          }}
          options={frequenceOptions}
        />
      </div>
      <Select
        label='Turbidité'
        placeholder='Sélectionner une fréquence'
        nativeSelectProps={{
          value: modalite?.freq_turbidite,
          onChange: e => setModalite(prev => ({...prev, freq_turbidite: e.target.value}))
        }}
        options={frequenceOptions}
      />
      <Input
        textArea
        label='Remarque'
        nativeTextAreaProps={{
          placeholder: 'Entrer une remarque',
          value: modalite?.remarque,
          onChange: e => setModalite(prev => ({...prev, remarque: e.target.value}))
        }}
      />
      <div className='flex justify-end'>
        <Button onClick={handleModalites}>
          Ajouter une modalité
        </Button>
      </div>
      {error && (
        <div className='text-center p-5 text-red-500'>
          <p><b>Un problème est survenu :</b></p>
          {error}
        </div>
      )}
      {modalites.length > 0 && (
        <div className='pt-5'>
          <div className='border-t border-gray-200 my-8' />
          <Typography variant='h6' className='pb-5'>
            Modalités ajoutées
          </Typography>
          {modalites.map((modalite, idx) => (
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
                <b>Modalité {idx + 1}</b>
                <small>
                  <i>
                    {[
                      modalite.freq_debit_preleve && `Débit prélevé : ${modalite.freq_debit_preleve}`,
                      modalite.freq_debit_reserve && `Débit réservé : ${modalite.freq_debit_reserve}`,
                      modalite.freq_volume_preleve && `Volume prélevé : ${modalite.freq_volume_preleve}`,
                      modalite.freq_niveau_eau && `Niveau eau : ${modalite.freq_niveau_eau}`,
                      modalite.freq_chlorures && `Chlorures : ${modalite.freq_chlorures}`,
                      modalite.freq_conductivite && `Conductivité : ${modalite.freq_conductivite}`,
                      modalite.freq_nitrates && `Nitrates : ${modalite.freq_nitrates}`,
                      modalite.freq_ph && `PH : ${modalite.freq_ph}`,
                      modalite.freq_sulfates && `Sulfates : ${modalite.freq_sulfates}`,
                      modalite.freq_temperature && `Température : ${modalite.freq_temperature}`,
                      modalite.freq_turbidite && `Turbidité : ${modalite.freq_turbidite}`
                    ].filter(Boolean).join(', ')}
                  </i>
                </small>
              </div>
              <div>
                <Button
                  iconId='fr-icon-delete-line'
                  priority='tertiary'
                  title='Delete'
                  style={{color: 'red'}}
                  onClick={() => handleDeleteModalite(idx)}
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

export default ModalitesForm
