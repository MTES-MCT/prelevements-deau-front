'use client'

import {useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import Link from 'next/link'

import {CampaignPagination, CampaignProgress, CampaignShell, CampaignStatus} from '@/components/campaigns/campaign-common.js'
import {campaignData, campaignDate, campaignState} from '@/lib/campaigns.js'
import {getCampaignsAction} from '@/server/actions/campaigns.js'

export default function CampaignList({initialData, initialError, admin = false}) {
  const [result, setResult] = useState(initialData || {items: [], total: 0, page: 1, pageSize: 25})
  const [error, setError] = useState(initialError)
  const [loading, setLoading] = useState(false)
  async function changePage(page) {
    setLoading(true)
    setError(null)
    try { setResult(campaignData(await getCampaignsAction({page, pageSize: 25}))) } catch (error) { setError(error.message) } finally { setLoading(false) }
  }
  const base = admin ? '/administration/campagnes' : '/campagnes'
  return (
    <CampaignShell admin={admin} title='Campagnes' description='Collectes d’informations auprès des préleveurs.' actions={admin && <Link className='fr-btn fr-btn--sm' href={`${base}/nouvelle`}>Créer une campagne</Link>}>
      {error && <Alert severity='error' title='Les campagnes ne peuvent pas être affichées' description={error} className='mb-4' />}
      {loading ? <p role='status'>Chargement des campagnes…</p> : !error && (
        <>
          {!result.items?.length && <p className='border bg-white p-5'>Aucune campagne pour le moment.</p>}
          <ul className='m-0 grid list-none gap-3 p-0'>
            {result.items?.map(campaign => (
              <li key={campaign.id} className='border border-gray-200 bg-white p-4'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div><h2 className='fr-h5 fr-mb-1w'><Link href={`${base}/${campaign.id}`}>{campaign.name}</Link></h2><CampaignStatus status={campaignState(campaign)} /></div>
                  <CampaignProgress progress={campaign.progress} />
                </div>
                <p className='fr-text--sm fr-mt-2w fr-mb-0'>Du {campaignDate(campaign.opensOn)} au {campaignDate(campaign.closesOn)}{campaign.collecteur?.socialReason ? ` · ${campaign.collecteur.socialReason}` : ''}</p>
              </li>
            ))}
          </ul>
          <CampaignPagination page={result.page || 1} total={result.total || 0} pageSize={result.pageSize || 25} onChange={changePage} />
        </>
      )}
    </CampaignShell>
  )
}
