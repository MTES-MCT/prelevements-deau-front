'use client'

import {useEffect, useId, useState} from 'react'

import Link from 'next/link'

import {CampaignCard, CampaignField} from '@/components/campaigns/campaign-ui.js'
import {campaignScheduleDay} from '@/lib/campaign-calendar.js'
import {
  campaignDate, campaignInclusiveEnd, campaignMeterName, campaignPointName, CAMPAIGN_KIND_LABELS, readingKey, unwrapCampaignResult
} from '@/lib/collection-campaigns.js'
import {getUsageColor, getUsageTextColor} from '@/lib/water-uses.js'
import {getCampaignResponseOverviewAction, getCampaignResponseResultsAction} from '@/server/actions/campaigns.js'

const kindsFor = campaign => Object.keys(CAMPAIGN_KIND_LABELS).filter(kind => campaign.periods?.some(period => period.kind === kind))
const plural = count => count > 1 ? 's' : ''

export const campaignResultVolume = value => {
  if (value === null || value === undefined || value === '' || !/^\d+(?:\.\d+)?$/.test(String(value))) {
    return null
  }

  const [integer, decimals] = String(value).split('.')
  return `${integer.replaceAll(/\B(?=(\d{3})+(?!\d))/g, '\u202F')}${decimals ? `,${decimals}` : ''} m³`
}

export const CampaignResponseStatus = ({response, timezone}) => {
  const correction = response?.correctionPending
  const received = response?.received
  const pendingLabel = response?.status === 'DRAFT' ? 'Brouillon' : 'À recevoir'
  const label = correction ? 'Correction à transmettre' : (received ? 'Reçue' : pendingLabel)
  return (
    <span className='block min-w-0'>
      <span className={`fr-badge fr-badge--sm fr-badge--no-icon ${correction ? 'fr-badge--warning' : (received ? 'fr-badge--success' : 'fr-badge--info')}`}>{label}</span>
      {received && response.latestSubmissionAt && <span className='mt-1 block text-xs text-[var(--text-mention-grey)]'>Reçue le {campaignDate(campaignScheduleDay(response.latestSubmissionAt, timezone))}</span>}
    </span>
  )
}

const PeriodResults = ({campaign, target, kind, response}) => {
  const submission = response?.latestSubmission
  const periods = (campaign.periods || []).filter(period => period.kind === kind)
  return (
    <section className='min-w-0'>
      <h5 className='fr-mb-1w text-sm font-bold'>{kind === 'INDEX' ? 'Volumes prélevés' : 'Besoins en eau'}</h5>
      {!submission && <p className='fr-mb-0 text-sm text-[var(--text-mention-grey)]'>Aucune réponse transmise.</p>}
      {submission && <dl className='fr-mb-0'>{periods.map(period => {
        const entry = kind === 'INDEX'
          ? submission.publication?.totals?.find(total => total.targetId === target.id && total.periodId === period.id)
          : submission.snapshot?.needs?.find(need => need.targetId === target.id && need.periodId === period.id)
        const volume = campaignResultVolume(kind === 'INDEX' ? entry?.value : entry?.requestedVolume)
        const unavailable = kind === 'INDEX' ? (entry?.status === 'CONFLICT' ? 'À vérifier' : 'Volume non calculable') : 'Volume non renseigné'
        const calculated = kind !== 'INDEX' || entry?.status === 'COMPLETE'
        return (
          <div key={period.id} className='border-b border-[var(--border-default-grey)] py-2 first:pt-0 last:border-b-0'>
            <dt className='text-xs font-medium'>{period.label || 'Période'}<span className='mt-1 block font-normal text-[var(--text-mention-grey)]'>Du {campaignDate(period.startDate)} au {campaignDate(campaignInclusiveEnd(period.endDate))}</span></dt>
            <dd className={`m-0 mt-1 text-sm tabular-nums ${volume && calculated ? 'font-bold' : 'text-[var(--text-mention-grey)]'}`}>{volume && calculated ? volume : unavailable}</dd>
          </div>
        )
      })}</dl>}
    </section>
  )
}

const PointReadings = ({target, submission}) => {
  const readings = submission?.snapshot?.readings?.filter(reading => reading.targetId === target.id) || []
  if (readings.length === 0) {
    return null
  }

  return (
    <details className='mt-4 text-sm'>
      <summary className='cursor-pointer'>Relevés transmis pour ce point</summary>
      <dl className='fr-mb-0 mt-2'>{readings.map(reading => {
        const meter = target.meters?.find(item => item.compteurId === reading.compteurId)
        return (
          <div key={readingKey(reading)} className='flex flex-wrap justify-between gap-2 border-b border-[var(--border-default-grey)] py-2 last:border-b-0'>
            <dt className='text-xs'>{campaignDate(reading.readingDate)}{meter && <span className='mt-1 block text-[var(--text-mention-grey)]'>{campaignMeterName(meter)}</span>}</dt>
            <dd className='m-0 text-xs tabular-nums'>{campaignResultVolume(reading.value) || `Relevé indisponible${reading.missingReason ? ` : ${reading.missingReason}` : ''}`}</dd>
          </div>
        )
      })}</dl>
    </details>
  )
}

export const CampaignResultsDetail = ({campaign, data}) => {
  const kinds = kindsFor(campaign)
  return (
    <div className='border-t border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] px-3 py-4 md:px-4'>
      {(data.targets || []).map(target => (
        <section key={target.id} className='mb-4 rounded border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-3 last:mb-0 md:p-4'>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
            <h4 className='fr-mb-0 min-w-0 break-words text-base font-bold'>{target.pointPrelevement?.id ? <Link className='fr-link' href={`/points-prelevement/${encodeURIComponent(target.pointPrelevement.id)}`}>{campaignPointName(target)}</Link> : campaignPointName(target)}</h4>
            <span className='inline-flex max-w-full rounded px-2 py-1 text-xs leading-tight' style={{backgroundColor: getUsageColor(target.usage), color: getUsageTextColor(target.usage)}}>{target.usage?.name || target.usage?.label || 'Usage non renseigné'}</span>
          </div>
          <div className='grid gap-5 md:grid-cols-2'>{kinds.map(kind => <PeriodResults key={kind} campaign={campaign} target={target} kind={kind} response={data.responses?.[kind]} />)}</div>
          <PointReadings target={target} submission={data.responses?.INDEX?.latestSubmission} />
        </section>
      ))}
      {data.targets?.length === 0 && <p className='fr-mb-0 text-sm'>Aucun point à afficher dans votre périmètre.</p>}
    </div>
  )
}

export const CampaignPreleveurResults = ({campaign, item}) => {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [retry, setRetry] = useState(0)
  const detailId = useId()
  useEffect(() => {
    if (!open || data) {
      return
    }

    let active = true
    setError(null)
    const load = async () => {
      try {
        const result = unwrapCampaignResult(await getCampaignResponseResultsAction(campaign.id, item.preleveur.userId))
        if (active) {
          setData({...result, preleveurUserId: item.preleveur.userId})
        }
      } catch (error_) {
        if (active) {
          setError(error_.message)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [open, data, campaign.id, item.preleveur.userId, retry])

  return (
    <article className='overflow-hidden rounded border border-[var(--border-default-grey)]'>
      <h3 className='fr-mb-0 text-sm'>
        <button type='button' aria-expanded={open} aria-controls={detailId} className='relative grid w-full grid-cols-1 items-center gap-3 bg-[var(--background-default-grey)] p-3 pr-10 text-left hover:bg-[var(--background-alt-grey)] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] md:p-4 md:pr-10' onClick={() => setOpen(previous => !previous)}>
          <span className='min-w-0'><span className='block break-words text-sm font-bold'>{item.preleveur.label}</span><span className='mt-1 block text-xs font-normal text-[var(--text-mention-grey)]'>{item.pointCount} point{plural(item.pointCount)}</span></span>
          {kindsFor(campaign).map(kind => <span key={kind} className='min-w-0 font-normal'><span className='mb-1 block text-xs text-[var(--text-mention-grey)]'>{CAMPAIGN_KIND_LABELS[kind]}</span><CampaignResponseStatus response={item.responses?.[kind]} timezone={campaign.timezone} /></span>)}
          <span className={`${open ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'} absolute right-3 top-3 text-[var(--text-action-high-blue-france)] md:top-1/2 md:-translate-y-1/2`} aria-hidden='true' />
          <span className='sr-only'>{open ? 'Masquer' : 'Afficher'} les points et résultats</span>
        </button>
      </h3>
      <div id={detailId} hidden={!open}>
        {open && !data && !error && <p role='status' className='fr-mb-0 p-4 text-sm'>Chargement des résultats transmis…</p>}
        {open && error && <div role='alert' className='p-4'><p className='text-sm'>Les résultats n’ont pas pu être chargés. {error}</p><button type='button' className='fr-btn fr-btn--secondary fr-btn--sm' onClick={() => setRetry(previous => previous + 1)}>Réessayer</button></div>}
        {open && data && <CampaignResultsDetail campaign={campaign} data={data} />}
      </div>
    </article>
  )
}

const CampaignResults = ({campaign, refreshKey = 0, actions}) => {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState({q: '', status: 'all'})
  const [cursor, setCursor] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retry, setRetry] = useState(0)
  const requestKey = JSON.stringify([campaign.id, refreshKey, filter.q, filter.status])
  const pageCursor = cursor?.requestKey === requestKey ? cursor.value : null
  const visibleData = data?.requestKey === requestKey ? data : null
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const load = async () => {
      try {
        const result = unwrapCampaignResult(await getCampaignResponseOverviewAction(campaign.id, {...filter, cursor: pageCursor, limit: 20}))
        if (active) {
          setData(previous => ({
            requestKey,
            items: [...new Map([...(pageCursor && previous?.requestKey === requestKey ? previous.items : []), ...result.items].map(item => [item.preleveur.userId, item])).values()],
            pagination: result.pagination
          }))
        }
      } catch (error_) {
        if (active) {
          setError(error_.message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [campaign.id, filter, pageCursor, requestKey, retry])

  return (
    <CampaignCard title='Suivi et résultats' description='Dépliez un préleveur pour consulter les résultats de ses points.'>
      {actions}
      <form role='search' className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-end' onSubmit={event => {
        event.preventDefault()
        setCursor(null)
        setFilter(previous => ({...previous, q: query.trim()}))
      }}
      >
        <div className='min-w-0 flex-1 [&_.fr-input-group]:!mb-0'><CampaignField compact label='Rechercher un préleveur ou un point' value={query} type='search' onChange={setQuery} /></div>
        <button className='fr-btn fr-btn--secondary fr-btn--sm' type='submit'>Rechercher</button>
        <div className='min-w-0 sm:w-64 [&_.fr-input-group]:!mb-0'><CampaignField compact label='Réponses' value={filter.status} options={[{value: 'all', label: 'Tous les préleveurs'}, {value: 'missing', label: 'Réponses encore attendues'}, {value: 'received', label: 'Toutes les réponses reçues'}, {value: 'correction', label: 'Corrections à transmettre'}]} onChange={status => {
          setCursor(null)
          setFilter(previous => ({...previous, status}))
        }} />
        </div>
      </form>
      {visibleData && <p role='status' className='fr-mb-2w text-xs text-[var(--text-mention-grey)]'>{visibleData.pagination.totalCount} préleveur{plural(visibleData.pagination.totalCount)}{filter.q || filter.status !== 'all' ? ' correspondant à votre recherche' : ''}</p>}
      <div className='space-y-3' aria-busy={loading}>{visibleData?.items.map(item => <CampaignPreleveurResults key={`${requestKey}-${item.preleveur.userId}`} campaign={campaign} item={item} />)}</div>
      {loading && <p role='status' className='fr-mb-0 mt-3 text-sm'>Chargement du suivi des réponses…</p>}
      {error && <div role='alert' className='mt-3'>
        <p className='text-sm'>Le suivi n’a pas pu être chargé. {error}</p>
        <button type='button' className='fr-btn fr-btn--secondary fr-btn--sm' disabled={loading} onClick={() => {
          setCursor(null)
          setRetry(previous => previous + 1)
        }}
        >{pageCursor ? 'Recharger la liste' : 'Réessayer'}</button>
      </div>}
      {!loading && !error && visibleData?.items.length === 0 && <p className='fr-mb-0 text-sm'>Aucun préleveur ne correspond à ces critères.</p>}
      {visibleData?.pagination.hasMore && !error && <button type='button' className='fr-btn fr-btn--tertiary fr-btn--sm mt-4' disabled={loading} onClick={() => setCursor({requestKey, value: visibleData.pagination.nextCursor})}>Afficher les préleveurs suivants</button>}
    </CampaignCard>
  )
}

export default CampaignResults
