'use client'

import {useRef, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import Link from 'next/link'
import {useRouter} from 'next/navigation'

import {CampaignPagination, CampaignProgress, CampaignShell, CampaignStatus, CampaignVolumes} from '@/components/campaigns/campaign-common.js'
import {campaignData, campaignDate, campaignExploitationLabel, campaignPersonLabel, campaignState, formatCampaignVolume, isCampaignRequester} from '@/lib/campaigns.js'
import {changeCampaignStateAction, deleteCampaignAction, getCampaignResponsesAction, getCampaignResultsAction} from '@/server/actions/campaigns.js'
import {exportCampaignResultsAction} from '@/server/actions/exports.js'

function RequestedVolumes({totals}) {
  const format = value => value === null || value === undefined ? 'Non renseigné' : `${new Intl.NumberFormat('fr-FR').format(Number(value))} m³`
  return <div className='mb-4 grid gap-3 sm:grid-cols-2'><div className='border bg-white p-3'><strong>Demandes étiage 2027</strong><p className='fr-mb-0'>{format(totals.requestedSeasonVolume)}</p></div><div className='border bg-white p-3'><strong>Demandes hors étiage 2026–2027</strong><p className='fr-mb-0'>{format(totals.requestedOffSeasonVolume)}</p></div></div>
}

export default function CampaignDetail({initialData, initialResponses, initialError, admin = false}) {
  const router = useRouter()
  const {campaign, permissions = campaign.permissions || {}} = initialData
  const [result, setResult] = useState(initialResponses || {items: [], total: 0, page: 1, pageSize: 25})
  const [filters, setFilters] = useState({q: '', status: ''})
  const [appliedFilters, setAppliedFilters] = useState({q: '', status: ''})
  const [tab, setTab] = useState('responses')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initialError)
  const requestId = useRef(0)
  const base = admin ? '/administration/campagnes' : '/campagnes'
  const requester = !admin && isCampaignRequester(permissions)
  const state = campaignState(campaign)
  const canOpen = permissions.canOpen && campaign.opensOn && campaign.closesOn && campaign.closesOn.slice(0, 10) >= '2026-10-31'

  async function load(page = 1, nextTab = tab, nextFilters = appliedFilters) {
    const current = ++requestId.current
    setLoading(true)
    setError(null)
    setTab(nextTab)
    try {
      const action = nextTab === 'results' ? getCampaignResultsAction : getCampaignResponsesAction
      const next = campaignData(await action(campaign.id, {...nextFilters, page, pageSize: 25}))
      if (current === requestId.current) { setResult(next); setAppliedFilters(nextFilters) }
    } catch (error) { if (current === requestId.current) setError(error.message) } finally { if (current === requestId.current) setLoading(false) }
  }
  async function changeState(operation) {
    const messages = {open: 'Ouvrir cette campagne aux préleveurs sélectionnés ?', close: 'Clôturer la campagne ? Les préleveurs ne pourront plus envoyer de réponse.', archive: 'Archiver la campagne ? Les réponses envoyées seront conservées.', delete: 'Supprimer ce brouillon de campagne ? Cette action est définitive.'}
    if (!window.confirm(messages[operation])) return
    setBusy(true)
    setError(null)
    try {
      campaignData(operation === 'delete' ? await deleteCampaignAction(campaign.id) : await changeCampaignStateAction(campaign.id, operation))
      if (operation === 'delete') router.push(base)
      router.refresh()
    } catch (error) { setError(error.message) } finally { setBusy(false) }
  }
  async function download() {
    setBusy(true)
    setError(null)
    try {
      const exported = campaignData(await exportCampaignResultsAction(campaign.id))
      const url = URL.createObjectURL(new Blob([exported.content], {type: 'text/csv;charset=utf-8'}))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = exported.fileName
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { setError(error.message) } finally { setBusy(false) }
  }
  return (
    <CampaignShell admin={admin} title={requester ? 'Mes index et mes besoins' : campaign.name} description={requester ? campaign.name : undefined} actions={<Link className='fr-btn fr-btn--sm fr-btn--tertiary fr-btn--icon-left fr-icon-arrow-left-line' href={requester ? '/tableau-de-bord' : base}>{requester ? 'Mon activité' : 'Toutes les campagnes'}</Link>}>
      <section className='mb-4 border bg-white p-4 md:p-5'>
        <div className='flex flex-wrap items-start justify-between gap-4'><div>{!requester && <CampaignStatus status={state} />}<p className={`fr-text--sm ${requester ? 'fr-mb-1v' : 'fr-mt-2w fr-mb-1v'}`}>{requester ? campaign.closesOn ? `Échéance : ${campaignDate(campaign.closesOn)}` : 'Dates à venir' : campaign.opensOn && campaign.closesOn ? `Du ${campaignDate(campaign.opensOn)} au ${campaignDate(campaign.closesOn)}` : 'Dates à renseigner'}</p><p className='fr-text--sm fr-mb-0'>{requester ? 'À transmettre à' : 'Collecteur :'} {campaignPersonLabel(campaign.collecteur)}</p></div><CampaignProgress requester={requester} progress={campaign.progress} /></div>
        {permissions.canManage && <div className='mt-4 flex flex-wrap gap-2'>
          {campaign.status !== 'ARCHIVED' && <Link className='fr-btn fr-btn--sm fr-btn--secondary' href={`/administration/campagnes/${campaign.id}/modifier`}>Modifier</Link>}
          {(state === 'DRAFT' || state === 'CLOSED') && <button className='fr-btn fr-btn--sm' type='button' disabled={busy || !canOpen} onClick={() => changeState('open')}>{state === 'CLOSED' ? 'Rouvrir' : 'Ouvrir la campagne'}</button>}
          {state === 'OPEN' && <button className='fr-btn fr-btn--sm fr-btn--secondary' type='button' disabled={busy} onClick={() => changeState('close')}>Clôturer</button>}
          {campaign.status !== 'ARCHIVED' && <button className='fr-btn fr-btn--sm fr-btn--tertiary' type='button' disabled={busy} onClick={() => changeState('archive')}>Archiver</button>}
          {permissions.canDelete && <button className='fr-btn fr-btn--sm fr-btn--tertiary' type='button' disabled={busy} onClick={() => changeState('delete')}>Supprimer le brouillon</button>}
        </div>}
        {permissions.canManage && state === 'DRAFT' && !canOpen && <p className='fr-hint-text fr-mt-2w fr-mb-0'>Pour ouvrir la campagne, précisez ses dates et une date de fin au plus tôt le 31 octobre 2026.</p>}
      </section>
      {permissions.canReadResults && <div className='mb-4 flex flex-wrap items-center gap-2' aria-label='Afficher'>
        <button className={`fr-btn fr-btn--sm ${tab === 'responses' ? '' : 'fr-btn--secondary'}`} type='button' aria-pressed={tab === 'responses'} onClick={() => load(1, 'responses', {})}>Suivi des réponses</button>
        <button className={`fr-btn fr-btn--sm ${tab === 'results' ? '' : 'fr-btn--secondary'}`} type='button' aria-pressed={tab === 'results'} onClick={() => load(1, 'results', {})}>Résultats envoyés</button>
        <button className='fr-btn fr-btn--sm fr-btn--tertiary ml-auto' type='button' disabled={busy} onClick={download}>Exporter tous les résultats (CSV)</button>
      </div>}
      {error && <Alert className='mb-4' severity='error' title='Chargement ou enregistrement impossible' description={error} />}
      {requester && <h2 className='fr-h5 fr-mb-2w'>Mes points concernés</h2>}
      {!requester && <form className='mb-3 flex flex-wrap items-end gap-3' onSubmit={event => { event.preventDefault(); load(1, tab, filters) }}>
        <div className='fr-input-group fr-mb-0 min-w-52 flex-1'><label className='fr-label' htmlFor='response-search'>Rechercher</label><input id='response-search' className='fr-input' type='search' placeholder='Préleveur, point, code comptage' value={filters.q} onChange={event => setFilters(previous => ({...previous, q: event.target.value}))} /></div>
        {tab === 'responses' && <div className='fr-select-group fr-mb-0'><label className='fr-label' htmlFor='response-status'>Réponse</label><select id='response-status' className='fr-select' value={filters.status} onChange={event => setFilters(previous => ({...previous, status: event.target.value}))}><option value=''>Toutes</option><option value='NOT_STARTED'>À compléter</option><option value='DRAFT'>Brouillon</option><option value='SUBMITTED'>Envoyé</option></select></div>}
        <button className='fr-btn fr-btn--secondary' type='submit' disabled={loading}>Filtrer</button>
      </form>}
      {loading ? <p role='status'>Chargement des réponses…</p> : !error && <>
        {tab === 'results' && result.totals && <RequestedVolumes totals={result.totals} />}
        {tab === 'results' && <CampaignVolumes volumes={result.totals?.publishedVolumes} />}
        {tab === 'results' && <p className='fr-text--sm'>Ces besoins sont des volumes demandés, pas des volumes prélevés. Les brouillons ne sont pas inclus.</p>}
        <ul className='m-0 grid list-none gap-2 p-0'>
          {result.items?.map(response => <li key={response.id} className='border bg-white p-4'>
            <div className='flex flex-wrap items-center justify-between gap-3'><div className='min-w-0'><p className='fr-mb-1v font-semibold'>{campaignExploitationLabel(response)}</p>{!requester && <p className='fr-text--sm fr-mb-1w'>{campaignPersonLabel(response.preleveur)}</p>}<CampaignStatus response status={response.status} />{response.lastSubmittedAt && <span className='ml-2 text-sm'>Dernier envoi : {campaignDate(response.lastSubmittedAt)}</span>}{response.hasDraft && response.lastSubmittedAt && <p className='fr-hint-text fr-mt-1w fr-mb-0'>Modification en brouillon, pas encore envoyée</p>}</div>
              {(requester || response.lastSubmittedAt || permissions.canRespond || permissions.canManage) && <Link className='fr-btn fr-btn--sm fr-btn--secondary' href={`${base}/${campaign.id}/reponses/${response.id}`}>{requester ? !permissions.canRespond || response.lastSubmittedAt ? 'Consulter ma réponse' : response.hasDraft ? 'Reprendre ma réponse' : 'Compléter ma réponse' : 'Consulter'}</Link>}
            </div>
            {response.lastSubmittedAt && response.publicationStatus && !['PUBLISHED', 'COMPLETED'].includes(response.publicationStatus) && <p className='fr-text--sm fr-mt-2w fr-mb-0 text-[#695240]'>Réponse envoyée · Volumes en attente de vérification</p>}
            {tab === 'results' && response.submittedData?.needs && <dl className='mt-3 grid gap-2 text-sm sm:grid-cols-2'>{['season', 'offSeason'].map(season => <div key={season}><dt className='font-medium'>{season === 'season' ? 'Étiage 2027' : 'Hors étiage 2026–2027'}</dt><dd className='m-0'>{response.submittedData.needs[season]?.volume ?? '—'} m³ demandés · {response.submittedData.needs[season]?.flow ?? '—'} m³/h</dd></div>)}</dl>}
            {tab === 'results' && response.volumes && <p className='fr-text--sm fr-mt-2w fr-mb-0'><strong>Volumes prélevés calculés :</strong> hors étiage {formatCampaignVolume(response.volumes.offSeason)} · étiage {formatCampaignVolume(response.volumes.season)}{response.volumes.partial ? ' · Résultat incomplet' : ''}</p>}
          </li>)}
        </ul>
        {!result.items?.length && <p className='border bg-white p-4'>{requester ? 'Aucun point à compléter pour cette campagne.' : 'Aucune réponse ne correspond à ces filtres.'}</p>}
        <CampaignPagination page={result.page || 1} total={result.total || 0} pageSize={result.pageSize || 25} onChange={page => load(page)} />
      </>}
    </CampaignShell>
  )
}
