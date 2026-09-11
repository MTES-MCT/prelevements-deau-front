'use client'

import {useEffect, useState} from 'react'

import Link from 'next/link'

import CampaignProgress from '@/components/campaigns/campaign-progress.js'
import {CampaignCard, CampaignNotice, CampaignShell} from '@/components/campaigns/campaign-ui.js'
import {isCampaignDay, shiftCampaignDay} from '@/lib/campaign-calendar.js'
import {getCampaignPosition} from '@/lib/campaign-timeline.js'
import {
  campaignArray, campaignDate, campaignDeadlineLabel, CAMPAIGN_KIND_LABELS, CAMPAIGN_STATUS_LABELS
} from '@/lib/collection-campaigns.js'

const LIST_STATUS_LABELS = {...CAMPAIGN_STATUS_LABELS, OPEN: 'Saisie ouverte', CLOSED: 'Saisie terminée'}
const BADGE_CLASSES = {success: 'fr-badge--success', warning: 'fr-badge--warning', info: 'fr-badge--info'}

const civilDay = value => {
  if (typeof value !== 'string') {
    return ''
  }

  const day = /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(value) ? value.slice(0, 10) : ''
  return isCampaignDay(day) ? day : ''
}

const dateRange = (start, end) => start === end ? `Le ${campaignDate(start)}` : `Du ${campaignDate(start)} au ${campaignDate(end)}`

export function campaignListCalendar(campaign) {
  const dates = (campaign.indexDates || []).map(date => civilDay(date))
  const readings = [...new Set(dates.filter(Boolean))].sort()
  const needs = (campaign.periods || []).filter(period => period.kind === 'NEEDS')
  const validNeeds = needs.map(period => ({start: civilDay(period.startDate), end: civilDay(period.endDate)}))
    .filter(period => period.start && period.end && period.start < period.end)
    .sort((first, second) => first.start.localeCompare(second.start) || first.end.localeCompare(second.end))
  return {
    readingDates: readings,
    needPeriods: validNeeds.map(period => ({start: period.start, end: shiftCampaignDay(period.end, -1)})),
    readingsIncomplete: readings.length === 0 || dates.some(date => !date),
    needsIncomplete: validNeeds.length === 0 || validNeeds.length !== needs.length
  }
}

const listDate = (value, timezone, deadline = false) => {
  if (!Number.isFinite(new Date(value).getTime())) {
    return 'Date à préciser'
  }

  try {
    return deadline ? campaignDeadlineLabel(value, timezone) : campaignDate(value, true, timezone)
  } catch {
    return 'Date à préciser'
  }
}

const ListFact = ({label, children}) => (
  <div className='min-w-0'>
    <dt className='mb-1 text-xs text-[var(--text-mention-grey)]'>{label}</dt>
    <dd className='!ml-0 mb-0 break-words text-sm [overflow-wrap:anywhere]'>{children}</dd>
  </div>
)

const CalendarMark = ({period = false}) => (
  <svg aria-hidden='true' focusable='false' viewBox='0 0 16 12' className={`mt-1 h-3 w-4 shrink-0 ${period ? 'text-[var(--text-label-green-emeraude)]' : 'text-[var(--text-action-high-blue-france)]'}`}>
    {period ? <path d='M2 6h12M2 2v8M14 2v8' fill='none' stroke='currentColor' strokeWidth='2' /> : <circle cx='8' cy='6' r='3' fill='currentColor' />}
  </svg>
)

const ListCalendar = ({campaign}) => {
  const calendar = campaignListCalendar(campaign)
  return (
    <dl className='mb-4 grid gap-3 rounded-sm bg-[var(--background-alt-grey)] p-3 sm:grid-cols-2'>
      <ListFact label='Relevés de compteurs'>
        {calendar.readingDates.length > 0 && <ul aria-label='Dates de relevé' className='fr-mb-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0'>
          {calendar.readingDates.map(date => <li key={date} className='flex items-start gap-1.5 p-0'><CalendarMark /><time dateTime={date}>{campaignDate(date)}</time></li>)}
        </ul>}
        {calendar.readingsIncomplete && <span className='block text-[var(--text-mention-grey)]'>Dates à préciser</span>}
      </ListFact>
      <ListFact label='Besoins en eau'>
        {calendar.needPeriods.length > 0 && <ul aria-label='Périodes de besoin' className='fr-mb-0 list-none space-y-1 p-0'>
          {calendar.needPeriods.map(period => <li key={`${period.start}-${period.end}`} className='flex items-start gap-1.5 p-0'><CalendarMark period /><span>{dateRange(period.start, period.end)}</span></li>)}
        </ul>}
        {calendar.needsIncomplete && <span className='block text-[var(--text-mention-grey)]'>Périodes à préciser</span>}
      </ListFact>
    </dl>
  )
}

function campaignListCounts(item) {
  if (item.counts) {
    const count = value => Number.isInteger(value) && value >= 0 ? value : null
    return {pointCount: count(item.counts.pointCount), preleveurCount: count(item.counts.preleveurCount)}
  }

  const campaign = item.campaign ?? item
  // Both arrays come from the API's authorised scope. Prefer the explicit one,
  // including when it is empty; never infer the full campaign's population.
  const targets = Array.isArray(item.targets) ? item.targets : campaign.targets
  const pointCount = Array.isArray(targets) ? new Set(targets.map(target => target.pointPrelevementId || target.pointPrelevement?.id || target.id || target)).size : null
  const preleveurs = targets?.map(target => target.preleveurUserId || target.preleveur?.userId) || []
  const preleveurCount = preleveurs.length > 0 && preleveurs.every(Boolean) ? new Set(preleveurs).size : null
  return {pointCount, preleveurCount}
}

const ListResponseDates = ({campaign, position}) => {
  const showOpening = campaign.status === 'DRAFT' || position.phase === 'SCHEDULED'
  return (
    <div className='min-w-0 text-sm'>
      {showOpening && <p className='fr-mb-1v'>{campaign.opensAt ? `Ouverture au plus tôt le ${listDate(campaign.opensAt, campaign.timezone)}` : 'Ouverture à votre initiative'}</p>}
      <p className='fr-mb-0'>{campaign.closesAt ? <>Date limite de réponse : <strong>{listDate(campaign.closesAt, campaign.timezone, true)}</strong></> : 'Aucune date limite de réponse définie'}</p>
      {campaign.status === 'DRAFT' && <p className='fr-mb-0 mt-1 text-xs text-[var(--text-mention-grey)]'>Les invitations seront envoyées à l’ouverture de la saisie.</p>}
    </div>
  )
}

export const CampaignManagementListCard = ({item, now}) => {
  const campaign = item.campaign ?? item
  const {pointCount, preleveurCount} = campaignListCounts(item)
  const canManage = item.permissions?.canManage === true || campaign.permissions?.canManage === true
  const canFollowup = (item.permissions ?? campaign.permissions)?.canFollowup === true
  const canPrepare = campaign.status === 'DRAFT' && canManage
  const position = ['DRAFT', 'OPEN', 'CLOSED'].includes(campaign.status) ? getCampaignPosition(campaign, now) : {label: 'État à vérifier'}
  return (
    <CampaignCard
      title={<span className='break-words [overflow-wrap:anywhere]'>{campaign.name || 'Campagne sans nom'}</span>}
      aside={<div className='mb-3 flex flex-wrap items-center gap-2'>
        {Number.isInteger(campaign.year) && <span className='text-xs text-[var(--text-mention-grey)]'>Année {campaign.year}</span>}
        <span className={`fr-badge fr-badge--sm ${BADGE_CLASSES[position.tone] || ''}`}>{position.label}</span>
      </div>}
    >
      <dl className='mb-4 grid gap-3 sm:grid-cols-3'>
        <ListFact label='Collecteur'>{campaign.owner?.label || 'Collecteur non renseigné'}</ListFact>
        <ListFact label='Territoire'>{campaign.zone?.name || 'Territoire non renseigné'}</ListFact>
        <ListFact label='Dans votre périmètre'>
          {pointCount === null ? 'Points non renseignés' : `${pointCount} point${pointCount > 1 ? 's' : ''}`}
          {preleveurCount !== null && <span className='block text-xs text-[var(--text-mention-grey)]'>{preleveurCount} préleveur{preleveurCount > 1 ? 's' : ''}</span>}
        </ListFact>
      </dl>
      <ListCalendar campaign={campaign} />
      {canFollowup && ['OPEN', 'CLOSED'].includes(campaign.status) && <CampaignProgress compact summary={item.progress} />}
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <ListResponseDates campaign={campaign} position={position} />
        <Link className='fr-btn fr-btn--secondary fr-btn--sm shrink-0' href={`/campagnes/${encodeURIComponent(campaign.id)}`}>
          {canPrepare ? 'Préparer la campagne' : 'Consulter le suivi'}<span className='fr-sr-only'> : {campaign.name}</span>
        </Link>
      </div>
    </CampaignCard>
  )
}

const CampaignList = ({data, error, kind, embedded = false}) => {
  const [now, setNow] = useState(null)
  const items = campaignArray(data).filter(item => !kind || (item.campaign ?? item).status !== 'DRAFT')
  const hasItems = items.length > 0
  useEffect(() => {
    if (kind || error || !hasItems) {
      return
    }

    // One local clock for the whole list; no requests and no SSR clock mismatch.
    const update = () => setNow(new Date().toISOString())
    update()
    const timer = setInterval(update, 60_000)
    return () => clearInterval(timer)
  }, [kind, error, hasItems])
  const base = kind === 'INDEX' ? '/mes-index' : '/mes-besoins'
  const canCreate = !kind && !error && data?.permissions?.canCreate === true
  const content = (
    <>
      <CampaignNotice error>{error}</CampaignNotice>
      {canCreate && (
        <div className='fr-mb-3w'>
          <Link className='fr-btn fr-icon-add-line fr-btn--icon-left' href='/campagnes/nouvelle'>Créer une campagne de collecte</Link>
        </div>
      )}
      {!error && items.length === 0 && (canCreate ? (
        <CampaignCard title='Préparer votre première collecte'>
          <ol className='fr-mb-0 space-y-2'>
            <li><strong>Préparez la demande.</strong> Choisissez les dates et les points concernés.</li>
            <li><strong>Ouvrez la saisie.</strong> Les préleveurs reçoivent une invitation pour saisir leurs relevés et leurs besoins.</li>
            <li><strong>Suivez les réponses.</strong> Consultez leur avancement et téléchargez les résultats.</li>
          </ol>
        </CampaignCard>
      ) : (
        <CampaignNotice>{kind ? 'Aucune demande en cours pour vos points de prélèvement.' : 'Aucune campagne disponible pour votre compte.'}</CampaignNotice>
      ))}
      {items.map(item => {
        const campaign = item.campaign ?? item
        if (!kind) {
          return <CampaignManagementListCard key={campaign.id} item={item} now={now} />
        }

        const linkLabel = campaign.status === 'CLOSED' ? 'Consulter mes réponses' : 'Consulter et répondre'
        return (
          <CampaignCard key={campaign.id} title={campaign.name} aside={<span className='fr-badge'>{LIST_STATUS_LABELS[campaign.status] || campaign.status}</span>}>
            <p className='fr-text--sm'>Année {campaign.year}{campaign.closesAt ? ` · Date limite de réponse : ${campaignDeadlineLabel(campaign.closesAt, campaign.timezone)}` : ''}</p>
            <Link className='fr-btn fr-btn--secondary' href={kind ? `${base}/${campaign.id}` : `/campagnes/${campaign.id}`}>{linkLabel}</Link>
          </CampaignCard>
        )
      })}
    </>
  )
  return embedded ? content : (
    <CampaignShell
      title={CAMPAIGN_KIND_LABELS[kind] || 'Campagnes de collecte'}
      description={kind ? 'Répondez aux demandes concernant vos points de prélèvement.' : 'Demandez les relevés de compteurs et les besoins en eau, puis suivez les réponses.'}
      backHref='/tableau-de-bord'
    >
      {content}
    </CampaignShell>
  )
}

export default CampaignList
