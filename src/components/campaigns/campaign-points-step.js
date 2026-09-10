'use client'

import {
  useEffect, useId, useRef, useState
} from 'react'

import {CampaignNotice} from '@/components/campaigns/campaign-ui.js'
import {
  campaignExploitationId, campaignPointScopeKey, campaignPointSelectionState, campaignPointUsageLabel, campaignPreleveurLabel,
  campaignSelectedPointCount, campaignSelectionDetails, loadCampaignPointResults, selectCampaignPointResults, toggleCampaignPoint
} from '@/lib/campaign-point-selection.js'
import {campaignPointName, unwrapCampaignResult} from '@/lib/collection-campaigns.js'
import {getUsageColor, getUsageTextColor} from '@/lib/water-uses.js'
import {getCampaignOptionsAction} from '@/server/actions/campaigns.js'

const pointColumns = 'grid grid-cols-[1rem_minmax(0,1fr)] gap-x-3 md:grid-cols-[1rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(8rem,0.8fr)]'

const UsageBadge = ({detail}) => (
  <span
    className='inline-flex max-w-full rounded px-2 py-0.5 text-xs font-medium leading-4'
    style={{backgroundColor: getUsageColor(detail?.usage), color: getUsageTextColor(detail?.usage)}}
  >
    {campaignPointUsageLabel(detail)}
  </span>
)

export const CampaignPointFilters = ({query, setQuery, usageId, setUsageId, usages}) => {
  const searchId = useId()
  const usageInputId = useId()
  const selectedUsage = usages.find(usage => usage.id === usageId)
  const resetFilters = () => {
    setQuery('')
    setUsageId?.('')
  }

  return (
    <div className='mb-3 grid items-end gap-3 rounded border border-gray-200 bg-gray-50 p-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]'>
      <div className='min-w-0'>
        <label className='mb-1 block text-xs font-medium text-gray-700' htmlFor={searchId}>Rechercher un point ou un préleveur</label>
        <div className='relative'>
          <span className='fr-icon-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 before:h-4 before:w-4' aria-hidden='true' />
          <input id={searchId} className='fr-input !min-h-9 !py-1.5 !pl-9 !text-sm' type='search' placeholder='Nom du point ou du préleveur' value={query} onChange={event => setQuery(event.target.value)} />
        </div>
      </div>
      <div className='min-w-0'>
        <label className='mb-1 block text-xs font-medium text-gray-700' htmlFor={usageInputId}>Filtrer par usage</label>
        <div className='relative'>
          <span className='pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full' style={{backgroundColor: getUsageColor(selectedUsage)}} aria-hidden='true' />
          <select id={usageInputId} className='fr-select !min-h-9 !py-1.5 !pl-8 !text-sm' value={usageId} disabled={!setUsageId} onChange={event => setUsageId?.(event.target.value)}>
            <option value=''>Tous les usages</option>
            {usages.map(usage => <option key={usage.id} value={usage.id}>{usage.name || usage.label}</option>)}
          </select>
        </div>
      </div>
      <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm !min-h-9 justify-self-start' disabled={!query && !usageId} onClick={resetFilters}>Effacer les filtres</button>
    </div>
  )
}

const TargetOption = ({detail, targets, knownTargets, disabled, onToggle}) => {
  const {selection, duplicate, external} = campaignPointSelectionState(detail, targets, knownTargets)
  const checked = Boolean(selection)
  const unavailable = disabled || (external && !checked) || (!selection && duplicate)
  const hintId = useId()
  let hint
  if (external) {
    hint = 'Ce point transmet déjà ses données par un autre outil.'
  } else if (duplicate && !selection) {
    hint = 'Ce point est déjà sélectionné avec une autre exploitation.'
  } else if (detail.ambiguousPoint && !selection) {
    hint = 'Plusieurs exploitations utilisent ce point. Cochez celle qui doit répondre.'
  }

  return (
    <div className={'border-b border-gray-200 last:border-b-0 ' + (checked ? 'bg-[#f5f5fe]' : 'bg-white hover:bg-gray-50')}>
      <label className={pointColumns + ' items-center gap-y-1 px-3 py-2.5 ' + (unavailable ? 'cursor-default' : 'cursor-pointer')}>
        <input className='col-start-1 row-start-1 h-4 w-4 accent-[#000091]' type='checkbox' checked={checked} disabled={unavailable} aria-describedby={hint ? hintId : undefined} onChange={event => onToggle(event.target.checked)} />
        <strong className='min-w-0 break-words text-sm font-medium leading-5'>{campaignPointName(detail)}</strong>
        <span className='col-start-2 min-w-0 break-words text-sm leading-5 text-gray-600 md:col-start-auto'>{campaignPreleveurLabel(detail)}</span>
        <span className='col-start-2 min-w-0 md:col-start-auto'><UsageBadge detail={detail} /></span>
      </label>
      {hint && <p id={hintId} className='!mb-0 -mt-1 pb-2 pl-10 pr-3 text-xs leading-4 text-gray-600'>{hint}</p>}
    </div>
  )
}

const CampaignPointsStep = ({form, options, knownTargets, query, setQuery, usageId = '', setUsageId, loadingOptions, update, onTargetsLoaded = () => {}, onBusyChange}) => {
  const params = {
    zoneId: form.zoneId, ownerCollecteurUserId: form.ownerCollecteurUserId, q: query, usageId
  }
  const scopeKey = campaignPointScopeKey(params)
  const [pages, setPages] = useState(null)
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)
  const requestId = useRef(0)
  const current = useRef(null)
  const mounted = useRef(true)
  current.current = {
    scopeKey, options, targets: form.targets, knownTargets
  }
  const extra = pages?.scopeKey === scopeKey && pages.base === options ? pages : null
  const rows = [...new Map([...(options.exploitations || []), ...(extra?.rows || [])].map(item => [campaignExploitationId(item), item])).values()]
  const pagination = extra?.pagination || options.pagination || {}
  const details = campaignSelectionDetails(knownTargets, rows)
  const visibleIds = new Set(rows.map(row => campaignExploitationId(row)))
  const outsideResults = form.targets.filter(item => !visibleIds.has(item.exploitationId))
  const disabled = loadingOptions || Boolean(busy)

  useEffect(() => {
    onBusyChange?.(disabled)
    return () => onBusyChange?.(false)
  }, [disabled, onBusyChange])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    requestId.current++
    setBusy(null)
    setMessage('')
    setError(null)
  }, [scopeKey, options])

  const startRequest = operation => {
    const id = ++requestId.current
    setBusy(operation)
    setError(null)
    setMessage('')
    return () => mounted.current && requestId.current === id && current.current.scopeKey === scopeKey && current.current.options === options
  }

  const fetchPage = async pageParams => unwrapCampaignResult(await getCampaignOptionsAction(pageParams))

  const selectResults = async included => {
    const isCurrent = startRequest(included ? 'select' : 'deselect')
    try {
      const results = await loadCampaignPointResults({fetchPage, params, isCurrent})
      if (!results || !isCurrent()) {
        return
      }

      const selection = selectCampaignPointResults(current.current.targets, results, current.current.knownTargets, included)
      onTargetsLoaded(results)
      update({targets: selection.targets})
      const skipped = [
        selection.skippedAmbiguous > 0 ? `${selection.skippedAmbiguous} point(s) partagé(s) entre plusieurs exploitations restent à choisir individuellement.` : '',
        selection.skippedExternal > 0 ? `${selection.skippedExternal} point(s) transmettent déjà leurs données par un autre outil et n’ont pas été ajoutés.` : ''
      ].filter(Boolean)
      setMessage([included ? 'Les résultats ont été ajoutés à la sélection.' : 'Les résultats ont été retirés de la sélection.', ...skipped].join(' '))
    } catch (error_) {
      if (isCurrent()) {
        setError(error_.message)
      }
    } finally {
      if (isCurrent()) {
        setBusy(null)
      }
    }
  }

  const loadMore = async () => {
    const isCurrent = startRequest('page')
    try {
      const page = await fetchPage({...params, cursor: pagination.nextCursor, limit: 500})
      if (!isCurrent()) {
        return
      }

      onTargetsLoaded(page.exploitations || [])
      setPages({
        scopeKey, base: options, rows: [...(extra?.rows || []), ...(page.exploitations || [])], pagination: page.pagination
      })
    } catch (error_) {
      if (isCurrent()) {
        setError(error_.message)
      }
    } finally {
      if (isCurrent()) {
        setBusy(null)
      }
    }
  }

  const toggle = (detail, included) => {
    setError(null)
    setMessage('')
    try {
      update({targets: toggleCampaignPoint(form.targets, detail, details, included)})
    } catch (error_) {
      setError(error_.message)
    }
  }

  const selectedCount = campaignSelectedPointCount(form.targets, details)
  return (
    <section className='mb-4 rounded border border-gray-200 bg-white p-3 md:p-4'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <h2 className='fr-h6 !mb-0'>Points concernés</h2>
        <span className='rounded bg-[#eeeeff] px-2 py-1 text-sm font-medium text-[#000091]' role='status'>{selectedCount + ' point' + (selectedCount > 1 ? 's sélectionnés' : ' sélectionné')}</span>
      </div>
      <CampaignPointFilters query={query} setQuery={setQuery} usageId={usageId} setUsageId={setUsageId} usages={options.usages || []} />
      <CampaignNotice error>{error}</CampaignNotice>
      {message && <p role='status' className='!mb-2 rounded bg-gray-50 px-3 py-2 text-sm leading-5'>{message}</p>}
      {loadingOptions && <p className='!mb-0 py-3 text-sm' role='status'>Recherche des points…</p>}
      {!loadingOptions && <>
        <div className='mb-2 flex flex-wrap items-center gap-x-3 gap-y-1'>
          <span className='mr-auto text-xs text-gray-600'>{pagination.hasMore && pagination.total !== undefined ? rows.length + ' sur ' : ''}{pagination.total ?? rows.length} résultat{(pagination.total ?? rows.length) > 1 ? 's' : ''}</span>
          <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' aria-label='Sélectionner tous les résultats' disabled={disabled || rows.length === 0} onClick={() => selectResults(true)}>Tout sélectionner</button>
          <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' aria-label='Désélectionner les résultats' disabled={disabled || rows.length === 0 || form.targets.length === 0} onClick={() => selectResults(false)}>Tout désélectionner</button>
        </div>
        {busy && <p className='!mb-2 text-sm' role='status'>{busy === 'page' ? 'Chargement des points…' : 'Mise à jour de la sélection…'}</p>}
        {rows.length === 0 && <CampaignNotice>Aucun point trouvé. Essayez une autre recherche ou un autre usage.</CampaignNotice>}
        {rows.length > 0 && <div className='overflow-hidden rounded border border-gray-200'>
          <div className={pointColumns + ' hidden border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 md:grid'} aria-hidden='true'>
            <span /><span>Point de prélèvement</span><span>Préleveur</span><span>Usage</span>
          </div>
          <div className='max-h-[28rem] overflow-y-auto' role='group' aria-label='Points de prélèvement trouvés'>
            {rows.map(detail => <TargetOption key={campaignExploitationId(detail)} detail={detail} targets={form.targets} knownTargets={details} disabled={disabled} onToggle={included => toggle(detail, included)} />)}
          </div>
        </div>}
        {pagination.hasMore && <button type='button' className='fr-btn fr-btn--secondary fr-btn--sm fr-mt-1w' disabled={disabled} onClick={loadMore}>Afficher plus de résultats</button>}
        {pagination.hasMore && <p className='fr-hint-text fr-mt-1w'>« Sélectionner tous les résultats » inclut aussi les pages suivantes, sauf les points à choisir individuellement.</p>}
      </>}
      {outsideResults.length > 0 && <details className='mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-2'>
        <summary className='cursor-pointer text-sm font-medium'>Sélection conservée hors des résultats affichés ({outsideResults.length})</summary>
        <ul className='!mb-0 mt-2 list-none p-0'>
          {outsideResults.map(item => {
            const detail = knownTargets.get(item.exploitationId)
            return (
              <li key={item.exploitationId} className='flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 py-2 last:border-b-0'>
                <span className='min-w-0 flex-1'><strong className='text-sm font-medium'>{campaignPointName(detail || {})}</strong><span className='block text-xs leading-5 text-gray-600'>{campaignPreleveurLabel(detail)}</span></span>
                <UsageBadge detail={detail} />
                <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' aria-label={'Retirer ' + campaignPointName(detail || {}) + ' de la sélection'} disabled={disabled} onClick={() => update({targets: form.targets.filter(target => target.exploitationId !== item.exploitationId)})}>Retirer</button>
              </li>
            )
          })}
        </ul>
      </details>}
    </section>
  )
}

export default CampaignPointsStep
