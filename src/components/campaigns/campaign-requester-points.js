'use client'

import {useEffect, useMemo, useRef, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import {CampaignPagination, CampaignStatus} from '@/components/campaigns/campaign-common.js'
import {campaignMapPoints, campaignResponseForPoint, loadCampaignMapResponses} from '@/lib/campaign-points.js'
import {campaignData, campaignDate, campaignExploitationLabel} from '@/lib/campaigns.js'
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
  const rowRefs = useRef(new Map())
  const points = useMemo(() => campaignMapPoints(responses), [responses])
  const selectedResponse = responses.find(response => response.id === selectedId)
  const activePointId = selectedResponse?.point?.id ?? selectedResponse?.exploitation?.pointPrelevement?.id
  const visibleResponses = responses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
    const index = responses.findIndex(item => item.id === response.id)
    setPage(Math.floor(index / PAGE_SIZE) + 1)
    if (reveal) requestAnimationFrame(() => rowRefs.current.get(response.id)?.focus({preventScroll: false}))
  }

  function selectPoint(pointId) {
    const response = campaignResponseForPoint(responses, pointId, selectedId)
    if (response) selectResponse(response, true)
  }

  return <>
    {error && <Alert className='mb-4' severity='error' title='Chargement ou enregistrement impossible' description={error} />}
    <div className='grid items-start gap-4 lg:grid-cols-2'>
      <div className='min-w-0'>
        <ul className='m-0 grid list-none gap-2 p-0'>
          {visibleResponses.map(response => <li key={response.id} className={`border bg-white p-4 ${response.id === selectedId ? 'border-[#000091]' : ''}`}>
            <button ref={element => { if (element) rowRefs.current.set(response.id, element); else rowRefs.current.delete(response.id) }} type='button' className='mb-2 block w-full text-left font-semibold' aria-pressed={response.id === selectedId} onClick={() => selectResponse(response)}>{campaignExploitationLabel(response)}</button>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div><CampaignStatus response status={response.status} />{response.lastSubmittedAt && <span className='ml-2 text-sm'>Dernier envoi : {campaignDate(response.lastSubmittedAt)}</span>}{response.hasDraft && response.lastSubmittedAt && <p className='fr-hint-text fr-mt-1w fr-mb-0'>Modification en brouillon, pas encore envoyée</p>}</div>
              <Link className='fr-btn fr-btn--sm fr-btn--secondary' href={`/campagnes/${campaignId}/reponses/${response.id}`}>{!canRespond || response.lastSubmittedAt ? 'Consulter ma déclaration' : response.hasDraft ? 'Reprendre ma déclaration' : 'Commencer ma déclaration'}</Link>
            </div>
            {response.lastSubmittedAt && response.publicationStatus && !['PUBLISHED', 'COMPLETED'].includes(response.publicationStatus) && <p className='fr-text--sm fr-mt-2w fr-mb-0 text-[#695240]'>Réponse envoyée · Volumes en attente de vérification</p>}
          </li>)}
        </ul>
        {!responses.length && <p className='border bg-white p-4'>Aucun point à compléter pour cette campagne.</p>}
        {loading && <p role='status'>Chargement des réponses…</p>}
        <CampaignPagination page={page} total={responses.length} pageSize={PAGE_SIZE} onChange={nextPage => { setPage(nextPage); setSelectedId(null) }} />
      </div>
      <div className='h-80 min-w-0 lg:sticky lg:top-4 lg:h-[36rem]' role='region' aria-label='Localisation des points de prélèvement'>
        <PointMap points={points} activePointId={activePointId} focusRequestId={focusRequestId} onFocusPoint={selectPoint} />
      </div>
    </div>
  </>
}
