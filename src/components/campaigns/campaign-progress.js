'use client'

import {useId} from 'react'

import {CAMPAIGN_KIND_LABELS} from '@/lib/collection-campaigns.js'

const count = value => Number.isSafeInteger(value) && value > 0 ? value : 0
const plural = value => value > 1 ? 's' : ''
const SEGMENTS = [
  {key: 'received', label: 'Reçues', color: 'bg-[var(--background-action-high-success)]'},
  {key: 'missing', label: 'Attendues', color: 'bg-[var(--background-contrast-grey)]'}
]

export const campaignProgressCounts = (summary = {}) => {
  const expected = count(summary.expectedCount)
  const received = Math.min(expected, count(summary.receivedCount))
  // Une réponse déjà transmise reste reçue, même si son déclarant prépare
  // une modification. La jauge mesure uniquement les réponses reçues / attendues.
  return {
    expected, received, missing: expected - received
  }
}

const ResponseKindProgress = ({kind, summary}) => {
  const counts = campaignProgressCounts(summary)
  const label = CAMPAIGN_KIND_LABELS[kind]
  const description = counts.expected > 0
    ? `${counts.received} reçue${plural(counts.received)} · ${counts.missing} attendue${plural(counts.missing)}`
    : 'Aucune réponse attendue'
  return (
    <div>
      <div className='mb-2 flex flex-wrap items-baseline justify-between gap-2'>
        <h4 className='fr-mb-0 text-sm font-bold'>{label}</h4>
        {counts.expected > 0 && <span className='text-xs tabular-nums text-[var(--text-mention-grey)]'>{counts.expected} réponse{plural(counts.expected)}</span>}
      </div>
      <div role='img' aria-label={`${label} : ${description}`} className='flex h-2 w-full overflow-hidden rounded-full bg-[var(--background-contrast-grey)]'>
        {SEGMENTS.filter(segment => counts[segment.key] > 0).map(segment => <span key={segment.key} aria-hidden='true' className={`h-full ${segment.color}`} style={{width: `${counts[segment.key] / counts.expected * 100}%`}} />)}
      </div>
      <p className='fr-mb-0 mt-2 text-xs tabular-nums text-[var(--text-mention-grey)]'>{description}</p>
    </div>
  )
}

const CampaignProgress = ({summary, loading = false, error, onRetry, compact = false}) => {
  const labelId = useId()
  if (loading) {
    return <p role='status' className='fr-mb-0 text-sm text-[var(--text-mention-grey)]'>Chargement de la progression…</p>
  }

  if (error) {
    return (
      <div role='alert' className='text-sm'>
        <p className='fr-mb-1w text-sm'>La progression n’a pas pu être chargée.</p>
        {onRetry && <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' onClick={onRetry}>Réessayer</button>}
      </div>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <section aria-labelledby={labelId} className={compact ? 'mb-4' : 'mt-4 border-t border-[var(--border-default-grey)] pt-4'}>
      <h3 id={labelId} className={compact ? 'fr-mb-1w text-sm font-bold' : 'sr-only'}>{compact ? 'Avancement des réponses' : 'Progression des réponses'}</h3>
      <div className={compact ? 'grid gap-3 sm:grid-cols-2' : 'space-y-4'}>{(compact ? ['INDEX', 'NEEDS'] : ['NEEDS', 'INDEX']).map(kind => <ResponseKindProgress key={kind} kind={kind} summary={summary.byKind?.[kind]} />)}</div>
      <ul aria-label='Légende des réponses' className='fr-mb-0 mt-3 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-xs text-[var(--text-mention-grey)]'>{SEGMENTS.map(segment => <li key={segment.key} className='flex items-center gap-2'><span className={`h-2.5 w-2.5 shrink-0 rounded-xs ${segment.color}`} aria-hidden='true' />{segment.label}</li>)}</ul>
      {summary.scopeComplete === false && <p className='fr-mb-0 mt-1 text-xs text-[var(--text-mention-grey)]'>Progression sur les points que vous êtes autorisé à suivre.</p>}
    </section>
  )
}

export default CampaignProgress
