import Link from 'next/link'

import AdminPageShell from '@/components/admin/admin-page-shell.js'
import {CAMPAIGN_STATUS_LABELS, RESPONSE_STATUS_LABELS, campaignDate, campaignParticipation, formatCampaignVolume} from '@/lib/campaigns.js'

export function CampaignShell({admin = false, title, description, actions, children}) {
  if (admin) return <AdminPageShell title={title} description={description} actions={actions}>{children}</AdminPageShell>
  return (
    <div className='min-h-screen bg-[#f7f7fb] pb-12'>
      <div className='fr-container pt-6 md:pt-8'>
        <header className='mb-5 flex flex-wrap items-start justify-between gap-3'>
          <div><h1 className='fr-h3 fr-mb-1w'>{title}</h1>{description && <p className='fr-text--sm fr-mb-0'>{description}</p>}</div>
          {actions}
        </header>
        {children}
      </div>
    </div>
  )
}

export function CampaignStatus({status, response = false}) {
  const label = (response ? RESPONSE_STATUS_LABELS : CAMPAIGN_STATUS_LABELS)[status] || status
  return <span className={`fr-badge fr-badge--sm ${status === 'SUBMITTED' || status === 'OPEN' ? 'fr-badge--success' : 'fr-badge--info'} fr-badge--no-icon`}>{label}</span>
}

export function CampaignProgress({progress = {}, requester = false}) {
  const total = progress.total || 0
  const submitted = progress.submitted || 0
  return (
    <div className='min-w-40'>
      <span className='text-sm'>{requester ? campaignParticipation({progress}).label : `${submitted} / ${total} exploitations ont répondu`}</span>
      {(!requester || total > 1) && <progress className='mt-1 block h-2 w-full accent-[#18753c]' max={total || 1} value={submitted} aria-label={requester ? `${submitted} réponses envoyées sur ${total}` : `${submitted} réponses sur ${total} exploitations`} />}
    </div>
  )
}

export function CampaignPagination({page, total, pageSize, onChange}) {
  const last = Math.max(1, Math.ceil(total / pageSize))
  if (last <= 1) return null
  return (
    <nav aria-label='Pagination' className='mt-4 flex flex-wrap items-center justify-between gap-3'>
      <button className='fr-btn fr-btn--sm fr-btn--secondary' type='button' disabled={page <= 1} onClick={() => onChange(page - 1)}>Précédent</button>
      <span className='text-sm'>Page {page} sur {last}</span>
      <button className='fr-btn fr-btn--sm fr-btn--secondary' type='button' disabled={page >= last} onClick={() => onChange(page + 1)}>Suivant</button>
    </nav>
  )
}

export function CampaignInvitations({summary}) {
  const campaigns = summary?.items || []
  if (!campaigns.length) return null
  return (
    <section className='mb-4 border border-[#c1c1fb] border-l-4 border-l-[#000091] bg-white p-5 md:p-6' aria-label='Mes index et mes besoins'>
      <h3 className='fr-h5 fr-mb-2w'>Mes index et mes besoins</h3>
      <ul className='m-0 grid list-none gap-4 p-0'>
        {campaigns.map(campaign => {
          const participation = campaignParticipation(campaign)
          return <li key={campaign.id} className='flex flex-wrap items-center justify-between gap-4'>
            <div className='min-w-0'>
              <p className='fr-text--sm fr-mb-1w font-medium'>{campaign.name}</p>
              <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                <span className={`fr-badge fr-badge--sm fr-badge--no-icon ${participation.complete ? 'fr-badge--success' : 'fr-badge--info'}`}>{participation.label}</span>
                {campaign.closesOn && <span className='text-sm text-gray-600'>Échéance : {campaignDate(campaign.closesOn)}</span>}
              </div>
            </div>
            <Link className={`fr-btn fr-btn--icon-right fr-icon-arrow-right-line ${participation.complete ? 'fr-btn--secondary' : ''}`} href={`/campagnes/${campaign.id}`}>{participation.action}</Link>
          </li>
        })}
      </ul>
    </section>
  )
}

export function CampaignVolumes({volumes}) {
  if (!volumes) return null
  return (
    <section className='mb-4 border bg-white p-4'>
      <h2 className='fr-h5 fr-mb-2w'>Volumes prélevés calculés</h2>
      <dl className='m-0 grid gap-3 sm:grid-cols-3'>
        {[['offSeason', 'Hors étiage 2025–2026'], ['season', 'Étiage 2026'], ['total', 'Total']].map(([key, label]) => <div key={key}><dt className='text-sm'>{label}</dt><dd className='m-0 font-semibold'>{formatCampaignVolume(volumes[key])}</dd></div>)}
      </dl>
      {volumes.partial && <p className='fr-hint-text fr-mt-2w fr-mb-0'>Total incomplet : certains volumes attendent encore une vérification.</p>}
    </section>
  )
}
