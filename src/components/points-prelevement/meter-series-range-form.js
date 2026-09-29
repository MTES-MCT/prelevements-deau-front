'use client'

import {useState} from 'react'
import Button from '@codegouvfr/react-dsfr/Button'
import Input from '@codegouvfr/react-dsfr/Input'
import {validateMeterSeriesRange} from './meter-series.js'

// Only offered after the exact-reading limit: ordinary charts keep their usual slider.
const MeterSeriesRangeForm = ({bounds, value, onApply}) => {
  const [start, setStart] = useState(value.start ?? '')
  const [end, setEnd] = useState(value.end ?? '')
  const [error, setError] = useState(null)
  const submit = event => {
    event.preventDefault()
    try {
      const range = validateMeterSeriesRange({start, end}, bounds)
      setError(null)
      onApply(range)
    } catch (failure) {
      setError(failure.message)
    }
  }
  return <form onSubmit={submit} className='flex flex-col gap-3' aria-label='Période des index du compteur'>
    <p className='fr-text--sm fr-mb-0'>Choisissez une période plus courte pour afficher les index.</p>
    <div className='flex flex-wrap items-end gap-3'>
      <Input label='Début de la période des index' nativeInputProps={{type: 'date', required: true, min: bounds.start, max: bounds.end, value: start, onChange: event => setStart(event.target.value)}} />
      <Input label='Fin de la période des index' nativeInputProps={{type: 'date', required: true, min: bounds.start, max: bounds.end, value: end, onChange: event => setEnd(event.target.value)}} />
      <Button type='submit'>Afficher cette période</Button>
    </div>
    {error && <p role='alert' className='fr-error-text'>{error}</p>}
  </form>
}

export default MeterSeriesRangeForm
