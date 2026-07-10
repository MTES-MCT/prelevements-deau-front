'use client'

import {useCallback, useState, useTransition} from 'react'

import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'

import {
  createZoneMonitoringStationAction,
  deleteZoneMonitoringStationAction,
  updateZoneMonitoringStationAction
} from '@/server/actions/zones.js'

const TYPE_LABELS = {
  PIEZOMETER: 'Piézomètre',
  FLOW_STATION: 'Station de débit'
}
const PROVIDER_LABELS = {
  PIEZOMETER: 'ADES via Hub’Eau',
  FLOW_STATION: 'Hydrométrie via Hub’Eau'
}
const SYNC_LABELS = {
  PENDING: 'Synchronisation en cours',
  READY: 'À jour',
  ERROR: 'Erreur de synchronisation'
}
const EMPTY_FORM = {
  type: 'PIEZOMETER',
  stationCode: '',
  label: '',
  enabled: true
}

function syncBadgeClass(status) {
  if (status === 'READY') {
    return 'fr-badge--success'
  }

  if (status === 'ERROR') {
    return 'fr-badge--error'
  }

  return 'fr-badge--info'
}

function sortStations(stations) {
  return [...stations].sort((first, second) => {
    const typeComparison = first.type.localeCompare(second.type)
    return typeComparison || first.label.localeCompare(second.label, 'fr')
  })
}

const StationForm = ({editingStation, form, isPending, onCancel, onChange, onSubmit}) => (
  <form className='grid grid-cols-1 items-end gap-4 md:grid-cols-2' onSubmit={onSubmit}>
    <div className='fr-select-group fr-mb-0'>
      <label className='fr-label' htmlFor='monitoring-station-type'>Type de ressource</label>
      <select
        className='fr-select cursor-pointer'
        disabled={isPending}
        id='monitoring-station-type'
        value={form.type}
        onChange={event => onChange('type', event.target.value)}
      >
        <option value='PIEZOMETER'>Piézomètre</option>
        <option value='FLOW_STATION'>Station de débit</option>
      </select>
    </div>

    <div className='fr-input-group fr-mb-0'>
      <label className='fr-label' htmlFor='monitoring-station-code'>
        {form.type === 'PIEZOMETER' ? 'Code BSS ou BSS ID' : 'Code station'}
      </label>
      <input
        required
        className='fr-input'
        disabled={isPending}
        id='monitoring-station-code'
        placeholder={form.type === 'PIEZOMETER' ? 'Ex. 10971X0198/LAFAR ou BSS002MUNP' : 'Ex. Y020401001'}
        value={form.stationCode}
        onChange={event => onChange('stationCode', event.target.value)}
      />
    </div>

    <div className='fr-input-group fr-mb-0'>
      <label className='fr-label' htmlFor='monitoring-station-label'>Libellé affiché</label>
      <input
        required
        className='fr-input'
        disabled={isPending}
        id='monitoring-station-label'
        value={form.label}
        onChange={event => onChange('label', event.target.value)}
      />
    </div>

    <div className='flex min-h-10 items-center'>
      <label className='flex cursor-pointer items-center gap-2 text-sm'>
        <input
          checked={form.enabled}
          className='h-4 w-4 cursor-pointer accent-[#000091]'
          disabled={isPending}
          type='checkbox'
          onChange={event => onChange('enabled', event.target.checked)}
        />
        <span>Ressource active</span>
      </label>
    </div>

    <div className='flex flex-wrap justify-end gap-2 md:col-span-2'>
      {editingStation && (
        <button
          className='fr-btn fr-btn--secondary'
          disabled={isPending}
          type='button'
          onClick={onCancel}
        >
          Annuler
        </button>
      )}
      <button className='fr-btn' disabled={isPending} type='submit'>
        {editingStation ? 'Enregistrer' : 'Ajouter la ressource'}
      </button>
    </div>
  </form>
)

const ZoneMonitoringStations = ({initialStations, zone}) => {
  const [stations, setStations] = useState(() => sortStations(initialStations))
  const [editingStation, setEditingStation] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [stationToDelete, setStationToDelete] = useState(null)
  const [isPending, startTransition] = useTransition()

  const updateForm = useCallback((key, value) => {
    setForm(current => ({...current, [key]: value}))
  }, [])

  const resetForm = useCallback(() => {
    setEditingStation(null)
    setForm(EMPTY_FORM)
  }, [])

  function beginEdit(station) {
    setError(null)
    setSuccess(null)
    setEditingStation(station)
    setForm({
      type: station.type,
      stationCode: station.stationCode,
      label: station.label,
      enabled: station.enabled
    })
    document.querySelector('#monitoring-station-form')?.scrollIntoView({behavior: 'smooth'})
  }

  const submit = useCallback(event => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = editingStation
        ? await updateZoneMonitoringStationAction(zone.id, editingStation.id, form)
        : await createZoneMonitoringStationAction(zone.id, form)

      if (!result.success) {
        setError(result.error || 'Impossible d’enregistrer cette ressource.')
        return
      }

      const station = result.data
      setStations(current => sortStations(editingStation
        ? current.map(item => item.id === station.id ? station : item)
        : [...current, station]))
      setSuccess(editingStation ? 'Ressource modifiée.' : 'Ressource ajoutée. La synchronisation des données va démarrer.')
      resetForm()
    })
  }, [editingStation, form, resetForm, zone.id])

  function toggleStation(station) {
    startTransition(async () => {
      setError(null)
      const result = await updateZoneMonitoringStationAction(zone.id, station.id, {
        type: station.type,
        stationCode: station.stationCode,
        label: station.label,
        enabled: !station.enabled
      })

      if (!result.success) {
        setError(result.error || 'Impossible de modifier cette ressource.')
        return
      }

      setStations(current => sortStations(current.map(item => item.id === station.id ? result.data : item)))
    })
  }

  const removeStation = useCallback(() => {
    if (!stationToDelete) {
      return
    }

    const station = stationToDelete
    startTransition(async () => {
      setError(null)
      const result = await deleteZoneMonitoringStationAction(zone.id, station.id)

      if (!result.success) {
        setError(result.error || 'Impossible de supprimer cette ressource.')
        return
      }

      setStations(current => current.filter(item => item.id !== station.id))
      if (editingStation?.id === station.id) {
        resetForm()
      }

      setStationToDelete(null)
      setSuccess('Ressource supprimée.')
    })
  }, [editingStation?.id, resetForm, stationToDelete, zone.id])

  const closeDeleteDialog = useCallback(() => {
    if (!isPending) {
      setStationToDelete(null)
    }
  }, [isPending])

  return (
    <div className='flex flex-col gap-5'>
      {error && <Alert severity='error'>{error}</Alert>}
      {success && <Alert severity='success'>{success}</Alert>}

      <section className='border border-gray-200 bg-white p-5 md:p-6'>
        <div className='mb-4'>
          <h2 className='fr-h4 fr-mb-1v'>Stations utilisées sur le tableau de bord</h2>
          <p className='fr-text--sm fr-mb-0 text-gray-700'>
            Seules les ressources actives sont affichées sur la carte et dans les graphiques de cette zone.
          </p>
        </div>

        {stations.length === 0 ? (
          <p className='fr-text--sm fr-mb-0 text-gray-600'>Aucune ressource configurée.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[860px] border-collapse text-left text-sm'>
              <thead>
                <tr className='border-b-2 border-gray-300'>
                  <th className='px-2 py-3'>Ressource</th>
                  <th className='px-2 py-3'>Code fournisseur</th>
                  <th className='px-2 py-3'>État</th>
                  {zone.isAdmin && <th className='px-2 py-3 text-right'>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {stations.map(station => (
                  <tr key={station.id} className='border-b border-gray-200 align-top'>
                    <td className='px-2 py-3'>
                      <strong className='block'>{station.label}</strong>
                      <span className='text-xs text-gray-600'>
                        {TYPE_LABELS[station.type]} · {PROVIDER_LABELS[station.type]}
                      </span>
                      {station.providerLabel && station.providerLabel !== station.label && (
                        <span className='mt-1 block text-xs text-gray-500'>{station.providerLabel}</span>
                      )}
                    </td>
                    <td className='px-2 py-3 font-mono text-xs'>
                      <span className='block'>{station.stationCode}</span>
                      {station.bssId && <span className='mt-1 block text-gray-500'>BSS ID {station.bssId}</span>}
                      {station.siteCode && <span className='mt-1 block text-gray-500'>Site {station.siteCode}</span>}
                    </td>
                    <td className='px-2 py-3'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className={`fr-badge fr-badge--sm fr-badge--no-icon ${station.enabled ? 'fr-badge--success' : 'fr-badge--warning'}`}>
                          {station.enabled ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`fr-badge fr-badge--sm fr-badge--no-icon ${syncBadgeClass(station.sync.status)}`}>
                          {SYNC_LABELS[station.sync.status]}
                        </span>
                      </div>
                      {station.sync.error && (
                        <p className='fr-text--xs fr-mb-0 mt-2 max-w-[360px] text-red-700'>{station.sync.error}</p>
                      )}
                    </td>
                    {zone.isAdmin && (
                      <td className='px-2 py-3'>
                        <div className='flex justify-end gap-2'>
                          <button
                            className='fr-btn fr-btn--tertiary fr-btn--sm'
                            disabled={isPending}
                            type='button'
                            onClick={() => toggleStation(station)}
                          >
                            {station.enabled ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            className='fr-btn fr-btn--secondary fr-btn--sm'
                            disabled={isPending}
                            type='button'
                            onClick={() => beginEdit(station)}
                          >
                            Modifier
                          </button>
                          <button
                            className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm'
                            disabled={isPending}
                            type='button'
                            onClick={() => setStationToDelete(station)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {zone.isAdmin && (
        <section id='monitoring-station-form' className='border border-gray-200 bg-white p-5 md:p-6'>
          <h2 className='fr-h4'>{editingStation ? 'Modifier la ressource' : 'Ajouter une ressource'}</h2>
          <StationForm
            editingStation={editingStation}
            form={form}
            isPending={isPending}
            onCancel={resetForm}
            onChange={updateForm}
            onSubmit={submit}
          />
        </section>
      )}

      <Dialog
        fullWidth
        maxWidth='sm'
        open={Boolean(stationToDelete)}
        onClose={closeDeleteDialog}
      >
        <DialogTitle>Supprimer cette ressource ?</DialogTitle>
        <DialogContent>
          La station « {stationToDelete?.label} » ne sera plus utilisée pour cette zone.
        </DialogContent>
        <DialogActions>
          <button
            className='fr-btn fr-btn--secondary'
            disabled={isPending}
            type='button'
            onClick={() => setStationToDelete(null)}
          >
            Annuler
          </button>
          <button className='fr-btn' disabled={isPending} type='button' onClick={removeStation}>
            Supprimer
          </button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default ZoneMonitoringStations
