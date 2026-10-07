'use client'

import {useEffect, useMemo, useRef, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import {CampaignPagination, CampaignStatus} from '@/components/campaigns/campaign-common.js'
import CampaignPointIdentity from '@/components/campaigns/campaign-point-identity.js'
import {campaignMapPoints, campaignResponseForPoint, filterCampaignPointResponses, loadCampaignMapResponses} from '@/lib/campaign-points.js'
import {campaignData, campaignDate} from '@/lib/campaigns.js'
import {getCampaignResponsesAction} from '@/server/actions/campaigns.js'

const PointMap = dynamic(() => import('@/components/declarations/quick-declaration-map.js'), {ssr: false, loading: () => <p role='status'>Chargement de la carte…</p>})
const PAGE_SIZE = 25

export default function CampaignRequesterPoints({campaignId, initialPage, canRespond}) {
  const [responses, setResponses] = useState(initialPage.items)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [focusRequestId, setFocusRequestId] = useState(0)
  const [loading, setLoading] = useState(initialPage.total > initialPage.items.length)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({q: '', status: ''})
  const rowRefs = useRef(new Map())
  const filteredResponses = useMemo(() => filterCampaignPointResponses(responses, filters), [responses, filters])
  const points = useMemo(() => campaignMapPoints(filteredResponses), [filteredResponses])
  const selectedResponse = filteredResponses.find(response => response.id === selectedId)
  const activePointId = selectedResponse?.point?.id ?? selectedResponse?.exploitation?.pointPrelevement?.id
  const visibleResponses = filteredResponses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    let current = true
    loadCampaignMapResponses(initialPage, async options => campaignData(await getCampaignResponsesAction(campaignId, options)))
      .then(items => {
        if (!current) return
        setResponses(items)
        setSelectedId(previous => items.some(response => response.id === previous) ? previous : null)
        setPage(1)
      })
      .catch(error => { if (current) setError(error.message) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [campaignId, initialPage])

  function selectResponse(response, reveal = false) {
    setSelectedId(response.id)
    setFocusRequestId(previous => previous + 1)
    const index = filteredResponses.findIndex(item => item.id === response.id)
    setPage(Math.floor(index / PAGE_SIZE) + 1)
    if (reveal) requestAnimationFrame(() => rowRefs.current.get(response.id)?.focus({preventScroll: false}))
  }

  function selectPoint(pointId) {
    const response = campaignResponseForPoint(filteredResponses, pointId, selectedId)
    if (response) selectResponse(response, true)
  }

  function changeFilter(name, value) {
    setFilters(previous => ({...previous, [name]: value}))
    setPage(1)
    setSelectedId(null)
  }

  return <>
    {error && <Alert className='mb-4' severity='error' title='Chargement ou enregistrement impossible' description={error} />}
    {initialPage.total > 5 && <div className='mb-4 flex flex-wrap items-end gap-3'>
      <div className='fr-input-group fr-mb-0 min-w-52 flex-1'><label className='fr-label' htmlFor='requester-point-search'>Rechercher un point</label><input id='requester-point-search' className='fr-input' type='search' placeholder='Nom du point, commune, code compteur' value={filters.q} onChange={event => changeFilter('q', event.target.value)} /></div>
      <div className='fr-select-group fr-mb-0'><label className='fr-label' htmlFor='requester-point-status'>Réponse</label><select id='requester-point-status' className='fr-select' value={filters.status} onChange={event => changeFilter('status', event.target.value)}><option value=''>Toutes</option><option value='NOT_STARTED'>À compléter</option><option value='DRAFT'>Brouillon</option><option value='SUBMITTED'>Envoyé</option></select></div>
    </div>}
    <div className='grid items-start gap-4 lg:grid-cols-2'>
      <div className='min-w-0'>
        <ul className='m-0 grid list-none gap-2 p-0'>
          {visibleResponses.map(response => <li key={response.id} className={`border bg-[var(--background-default-grey)] p-4 ${response.id === selectedId ? 'border-[var(--border-active-blue-france)]' : 'border-[var(--border-default-grey)]'}`}>
            <button ref={element => { if (element) rowRefs.current.set(response.id, element); else rowRefs.current.delete(response.id) }} type='button' className='mb-3 block w-full text-left' aria-pressed={response.id === selectedId} onClick={() => selectResponse(response)}><CampaignPointIdentity response={response} /></button>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div><CampaignStatus response status={response.status} />{response.lastSubmittedAt && <span className='ml-2 text-sm'>Dernier envoi : {campaignDate(response.lastSubmittedAt)}</span>}{response.hasDraft && response.lastSubmittedAt && <p className='fr-hint-text fr-mt-1w fr-mb-0'>Modification en brouillon, pas encore envoyée</p>}</div>
              <Link className='fr-btn fr-btn--sm fr-btn--secondary' href={`/campagnes/${campaignId}/reponses/${response.id}`}>{!canRespond || response.lastSubmittedAt ? 'Consulter ma déclaration' : response.hasDraft ? 'Reprendre ma déclaration' : 'Commencer ma déclaration'}</Link>
            </div>
          </li>)}
        </ul>
        {!filteredResponses.length && !loading && !error && <p className='border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-4'>{responses.length ? 'Aucun point ne correspond à ces filtres.' : 'Aucun point à compléter pour cette campagne.'}</p>}
        {loading && <p role='status'>Chargement des réponses…</p>}
        <CampaignPagination page={page} total={filteredResponses.length} pageSize={PAGE_SIZE} onChange={nextPage => { setPage(nextPage); setSelectedId(null) }} />
      </div>
      <div className='h-80 min-w-0 lg:sticky lg:top-4 lg:h-[36rem]' role='region' aria-label='Localisation des points de prélèvement'>
        <PointMap points={points} activePointId={activePointId} focusRequestId={focusRequestId} onFocusPoint={selectPoint} />
      </div>
    </div>
  </>
}
