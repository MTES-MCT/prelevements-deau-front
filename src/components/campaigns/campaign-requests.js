'use client'

import {useState} from 'react'

import Link from 'next/link'

import {
  campaignRequestHasAction, campaignRequestKey, campaignRequestResponseState, mergeCampaignRequests
} from '@/lib/campaign-requests.js'
import {
  campaignDate, campaignDeadlineLabel, campaignResponseHref, unwrapCampaignResult
} from '@/lib/collection-campaigns.js'
import {listCampaignRequestsAction} from '@/server/actions/campaigns.js'

const tones = {
  success: 'bg-[#e6f4ea] text-[#18753c]',
  pending: 'bg-[#eeeeff] text-[#000091]',
  neutral: 'bg-gray-100 text-gray-700'
}
const kinds = {INDEX: 'Relevés de compteurs', NEEDS: 'Besoins en eau'}

const RequestResponse = ({item, kind, now}) => {
  const response = item.responses?.[kind]
  const state = campaignRequestResponseState(item.campaign, response, now)
  return (
    <div className='flex flex-wrap items-center gap-2 border-t border-gray-200 px-3 py-2.5 md:px-4'>
      <div className='min-w-0 flex-1 basis-40'>
        <h4 className='!mb-0 text-sm font-medium'>{kinds[kind]}</h4>
        {response?.latestSubmissionAt && <p className='!mb-0 text-xs text-gray-600'>Dernière transmission le {campaignDate(response.latestSubmissionAt)}</p>}
      </div>
      <span className={'rounded-sm px-2 py-1 text-xs font-medium ' + tones[state.tone]}>{state.label}</span>
      <Link
        className={'fr-btn fr-btn--sm ' + (state.actionable ? 'fr-btn--secondary' : 'fr-btn--tertiary-no-outline')}
        href={campaignResponseHref(item.campaign.id, kind, item.preleveur.userId)}
        aria-label={`${state.action} — ${kinds[kind]} — ${item.campaign.name}`}
      >{state.action}</Link>
    </div>
  )
}

const RequestCard = ({item, showPreleveur, now}) => (
  <article className='overflow-hidden rounded-sm border border-gray-200 bg-white'>
    <div className='px-3 py-3 md:px-4'>
      <h3 className='!mb-1 text-base font-semibold'>{item.campaign.name}</h3>
      <p className='!mb-0 text-sm text-gray-600'>
        {item.campaign.owner?.label ? `Demandé par ${item.campaign.owner.label}` : 'Demande de votre collecteur'}
        {showPreleveur && item.preleveur.label ? ` · ${item.preleveur.label}` : ''}
        {' · ' + item.pointCount + ' point' + (item.pointCount > 1 ? 's' : '')}
      </p>
      {item.campaign.closesAt && <p className='!mb-0 mt-1 text-xs text-gray-600'>Date limite : {campaignDeadlineLabel(item.campaign.closesAt, item.campaign.timezone)}</p>}
      {item.campaign.opensAt && new Date(item.campaign.opensAt).getTime() > now && <p className='!mb-0 mt-1 text-xs text-gray-600'>Début de saisie : {campaignDate(item.campaign.opensAt)}</p>}
    </div>
    {Object.keys(kinds).map(kind => <RequestResponse key={kind} item={item} kind={kind} now={now} />)}
  </article>
)

const CampaignRequests = ({initialData, initialError, showPreleveur = false, now}) => {
  const [items, setItems] = useState(initialData?.items || [])
  const [pagination, setPagination] = useState(initialData?.pagination || {})
  const [error, setError] = useState(initialError)
  const [loading, setLoading] = useState(false)
  const active = items.filter(item => campaignRequestHasAction(item, now))
  const other = items.filter(item => !campaignRequestHasAction(item, now))
  const loadMore = async () => {
    setLoading(true)
    setError(null)
    try {
      const page = unwrapCampaignResult(await listCampaignRequestsAction({cursor: pagination.nextCursor}))
      setItems(previous => mergeCampaignRequests(previous, page.items || []))
      setPagination(page.pagination || {})
    } catch (error_) {
      setError(error_.message)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0 && !error && !loading && !pagination.hasMore) {
    return null
  }

  return (
    <section id='demandes' aria-labelledby='campaign-requests-title' className='mb-6 scroll-mt-4'>
      <div className='mb-3 flex flex-wrap items-center gap-2'>
        <h2 id='campaign-requests-title' className='fr-h5 !mb-0'>Demandes reçues</h2>
        {active.length > 0 && <span className='rounded-sm bg-[#eeeeff] px-2 py-1 text-xs font-medium text-[#000091]'>À compléter</span>}
      </div>
      {error && <div role='alert' className='mb-3 rounded-sm border border-gray-200 bg-white p-3 text-sm'>
        <p className='!mb-2'>Les demandes n’ont pas pu être chargées. Vos déclarations restent disponibles ci-dessous.</p>
        <button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm' disabled={loading} onClick={loadMore}>Réessayer</button>
      </div>}
      <div className='space-y-3'>{active.map(item => <RequestCard key={campaignRequestKey(item)} item={item} showPreleveur={showPreleveur} now={now} />)}</div>
      {other.length > 0 && <details className='mt-3 rounded-sm border border-gray-200 bg-gray-50 p-3'>
        <summary className='cursor-pointer text-sm font-medium'>Demandes transmises ou à consulter ({other.length})</summary>
        <div className='mt-3 space-y-3'>{other.map(item => <RequestCard key={campaignRequestKey(item)} item={item} showPreleveur={showPreleveur} now={now} />)}</div>
      </details>}
      {pagination.hasMore && !error && <button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm mt-3' disabled={loading} onClick={loadMore}>Afficher plus de demandes</button>}
      {loading && <p role='status' className='!mb-0 mt-2 text-sm'>Chargement des demandes…</p>}
    </section>
  )
}

export default CampaignRequests
