import Link from 'next/link'

import {campaignRequestHasAction, campaignRequestKey, campaignRequestResponseState} from '@/lib/campaign-requests.js'
import {campaignDeadlineLabel, campaignResponseHref, unwrapCampaignResult} from '@/lib/collection-campaigns.js'
import {listCampaignRequestsAction} from '@/server/actions/campaigns.js'

const kinds = {INDEX: 'Relevés de compteurs', NEEDS: 'Besoins en eau'}

export const CampaignRequestsSummary = ({data, user, now = Date.now()}) => {
  if (user?.role !== 'DECLARANT') {
    return null
  }

  const items = (data?.items ?? []).filter(item => campaignRequestHasAction(item, now)).slice(0, 3)
  if (items.length === 0) {
    return null
  }

  const total = Math.max(items.length, Number(data.total) || 0)
  return (
    <section aria-labelledby='dashboard-campaign-requests-title' className='mb-6 border border-[#c6c6fb] bg-[#f5f5fe] p-4 md:p-5'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <h2 id='dashboard-campaign-requests-title' className='!mb-0 text-lg font-semibold text-[#000091]'>Demandes à compléter</h2>
          <span className='rounded bg-[#e3e3fd] px-2 py-0.5 text-xs font-semibold text-[#000091]' aria-label={`${total} demande${total > 1 ? 's' : ''} à compléter`}>{total}</span>
        </div>
        <Link className='fr-link fr-link--sm' href='/mes-declarations#demandes'>Voir mes demandes</Link>
      </div>
      <div className='grid gap-3 md:grid-cols-3'>
        {items.map(item => {
          const actionableKinds = Object.keys(kinds).filter(kind => campaignRequestResponseState(item.campaign, item.responses?.[kind], now).actionable)
          const showPreleveur = item.preleveur.userId !== user.id || user.declarantRole === 'COLLECTEUR'
          return (
            <article key={campaignRequestKey(item)} className='flex min-w-0 flex-col rounded border border-[#ddddf1] bg-white p-3 md:p-4'>
              <h3 className='!mb-1 text-base font-semibold'>{item.campaign.name}</h3>
              {showPreleveur && item.preleveur.label && <p className='!mb-1 text-sm font-medium'>{item.preleveur.label}</p>}
              <p className='!mb-0 text-xs text-[var(--text-mention-grey)]'>
                {item.campaign.owner?.label ? `Demandé par ${item.campaign.owner.label}` : 'Demande de votre collecteur'}
              </p>
              {item.deadlineAt && <p className='!mb-0 mt-2 text-xs font-medium text-[#000091]'>Prochaine échéance : {campaignDeadlineLabel(item.deadlineAt, item.campaign.timezone)}</p>}
              <div className='mt-auto flex flex-col items-start gap-2 pt-3'>
                {actionableKinds.map(kind => (
                  <Link
                    key={kind}
                    className='fr-btn fr-btn--sm fr-btn--secondary !h-auto max-w-full'
                    href={campaignResponseHref(item.campaign.id, kind, item.preleveur.userId)}
                    aria-label={`Compléter : ${kinds[kind]} · ${item.campaign.name}${showPreleveur && item.preleveur.label ? ` · ${item.preleveur.label}` : ''}`}
                  >{kinds[kind]}</Link>
                ))}
              </div>
              {actionableKinds.every(kind => !item.responses[kind].canSubmit) && <p className='!mb-0 mt-2 text-xs text-[var(--text-mention-grey)]'>Complétez les points qui vous sont confiés. Le préleveur ou un collecteur habilité transmettra la réponse.</p>}
            </article>
          )
        })}
      </div>
    </section>
  )
}

// Chargement indépendant du tableau de bord : une demande lente ou indisponible
// ne retarde ni la carte ni les graphiques.
const DashboardCampaignRequests = async ({user}) => {
  if (user?.role !== 'DECLARANT') {
    return null
  }

  try {
    const data = unwrapCampaignResult(await listCampaignRequestsAction({actionableOnly: true, limit: 3}))
    return <CampaignRequestsSummary data={data} user={user} />
  } catch {
    return null
  }
}

export default DashboardCampaignRequests
