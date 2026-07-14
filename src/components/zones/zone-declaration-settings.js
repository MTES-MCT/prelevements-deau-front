'use client'

import {useMemo, useState, useTransition} from 'react'

import {Alert, Box, TextField} from '@mui/material'

import {
  createZoneDeclarationOverrideAction,
  deleteZoneDeclarationOverrideAction,
  updateZoneDeclarationSettingsAction
} from '@/server/actions/zones.js'

const PERIOD_LABELS = {
  month: 'Mensuel',
  week: 'Hebdomadaire'
}

const REASON_LABELS = {
  DROUGHT: 'Sécheresse',
  STRUCTURAL: 'Structurel',
  OTHER: 'Autre'
}

function toInputDate(value) {
  return value ? String(value).slice(0, 10) : ''
}

function overlaps(a, b) {
  return a.startDate <= b.endDate && a.endDate >= b.startDate
}

const Timeline = ({overrides}) => {
  if (overrides.length === 0) {
    return <Alert severity='info'>Aucune période spécifique configurée.</Alert>
  }

  return (
    <div className='flex flex-col gap-2'>
      {overrides.map(override => (
        <div key={override.id} className='grid grid-cols-[140px_1fr] gap-3 items-center'>
          <div className='fr-text--sm fr-mb-0 text-gray-600'>
            {toInputDate(override.startDate)}<br />{toInputDate(override.endDate)}
          </div>
          <div className='border-l-4 border-blue-600 bg-blue-50 px-3 py-2'>
            <strong>{PERIOD_LABELS[override.periodType]}</strong>
            <span className='ml-2'>{REASON_LABELS[override.reason] || override.reason}</span>
            {override.label && <span className='ml-2 text-gray-600'>{override.label}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

const ZoneDeclarationSettings = ({zone, settings}) => {
  const [defaultPeriodType, setDefaultPeriodType] = useState(settings.defaultPeriodType || 'month')
  const [overrides, setOverrides] = useState(settings.overrides || [])
  const [form, setForm] = useState({
    periodType: 'week',
    reason: 'DROUGHT',
    label: '',
    startDate: '',
    endDate: ''
  })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isPending, startTransition] = useTransition()

  const hasOverlap = useMemo(() => {
    if (!form.startDate || !form.endDate) {
      return false
    }

    return overrides.some(override => overlaps({
      startDate: form.startDate,
      endDate: form.endDate
    }, {
      startDate: toInputDate(override.startDate),
      endDate: toInputDate(override.endDate)
    }))
  }, [form.startDate, form.endDate, overrides])

  const updateDefaultPeriod = event => {
    const {value} = event.target
    setDefaultPeriodType(value)
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await updateZoneDeclarationSettingsAction(zone.id, {
        defaultPeriodType: value
      })

      if (result.success) {
        setSuccess('Configuration enregistrée.')
      } else {
        setError(result.error)
      }
    })
  }

  const submitOverride = event => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (hasOverlap) {
      setError('Cette période chevauche une période existante.')
      return
    }

    startTransition(async () => {
      const result = await createZoneDeclarationOverrideAction(zone.id, form)

      if (result.success) {
        setOverrides(current => [...current, result.data.data || result.data].sort((a, b) => toInputDate(a.startDate).localeCompare(toInputDate(b.startDate))))
        setForm({
          periodType: 'week',
          reason: 'DROUGHT',
          label: '',
          startDate: '',
          endDate: ''
        })
        setSuccess('Période ajoutée.')
      } else {
        setError(result.error)
      }
    })
  }

  const deleteOverride = override => {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await deleteZoneDeclarationOverrideAction(zone.id, override.id)

      if (result.success) {
        setOverrides(current => current.filter(item => item.id !== override.id))
        setSuccess('Période supprimée.')
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className='flex flex-col gap-5'>
      {error && <Alert severity='error'>{error}</Alert>}
      {success && <Alert severity='success'>{success}</Alert>}

      <section className='border border-gray-200 bg-white p-5'>
        <h2 className='fr-h4'>Pas de temps par défaut</h2>
        <div className='fr-select-group max-w-sm'>
          <label className='fr-label' htmlFor='default-period-type'>Pas de temps</label>
          <select
            className='fr-select'
            disabled={isPending || !zone.permissions?.includes('zone.declaration.settings.update')}
            id='default-period-type'
            value={defaultPeriodType}
            onChange={updateDefaultPeriod}
          >
            <option value='month'>Mensuel</option>
            <option value='week'>Hebdomadaire</option>
          </select>
        </div>
      </section>

      <section className='border border-gray-200 bg-white p-5'>
        <h2 className='fr-h4'>Périodes spécifiques</h2>
        <Timeline overrides={overrides} />
      </section>

      {zone.permissions?.includes('zone.declaration.override.create') && (
        <section className='border border-gray-200 bg-white p-5'>
          <h2 className='fr-h4'>Ajouter une période</h2>
          <form className='grid grid-cols-1 md:grid-cols-2 gap-4' onSubmit={submitOverride}>
            <div className='fr-select-group fr-mb-0'>
              <label className='fr-label' htmlFor='override-period-type'>Pas de temps</label>
              <select
                className='fr-select'
                id='override-period-type'
                value={form.periodType}
                onChange={event => setForm(current => ({...current, periodType: event.target.value}))}
              >
                <option value='week'>Hebdomadaire</option>
                <option value='month'>Mensuel</option>
              </select>
            </div>
            <div className='fr-select-group fr-mb-0'>
              <label className='fr-label' htmlFor='override-reason'>Motif</label>
              <select
                className='fr-select'
                id='override-reason'
                value={form.reason}
                onChange={event => setForm(current => ({...current, reason: event.target.value}))}
              >
                <option value='DROUGHT'>Sécheresse</option>
                <option value='STRUCTURAL'>Structurel</option>
                <option value='OTHER'>Autre</option>
              </select>
            </div>
            <TextField
              required
              label='Date de début'
              type='date'
              value={form.startDate}
              InputLabelProps={{shrink: true}}
              onChange={event => setForm(current => ({...current, startDate: event.target.value}))}
            />
            <TextField
              required
              label='Date de fin'
              type='date'
              value={form.endDate}
              InputLabelProps={{shrink: true}}
              onChange={event => setForm(current => ({...current, endDate: event.target.value}))}
            />
            <TextField
              className='md:col-span-2'
              label='Libellé'
              value={form.label}
              onChange={event => setForm(current => ({...current, label: event.target.value}))}
            />
            {hasOverlap && (
              <Alert className='md:col-span-2' severity='error'>
                Cette période chevauche une période existante.
              </Alert>
            )}
            <Box className='md:col-span-2 flex justify-end'>
              <button className='fr-btn' disabled={isPending || hasOverlap} type='submit'>
                Ajouter
              </button>
            </Box>
          </form>
        </section>
      )}

      {overrides.length > 0 && zone.permissions?.includes('zone.declaration.override.delete') && (
        <section className='border border-gray-200 bg-white p-5'>
          <h2 className='fr-h4'>Périodes enregistrées</h2>
          <div className='flex flex-col gap-2'>
            {overrides.map(override => (
              <div key={override.id} className='flex items-center justify-between gap-3 border-b border-gray-200 py-2'>
                <div>
                  <strong>{PERIOD_LABELS[override.periodType]}</strong>
                  <span className='ml-2'>{toInputDate(override.startDate)} - {toInputDate(override.endDate)}</span>
                </div>
                <button className='fr-btn fr-btn--sm fr-btn--tertiary' type='button' onClick={() => deleteOverride(override)}>
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default ZoneDeclarationSettings
