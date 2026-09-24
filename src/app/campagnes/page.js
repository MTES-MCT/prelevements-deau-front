import {forbidden, redirect} from 'next/navigation'

import CampaignList from '@/components/campaigns/campaign-list.js'
import {isCampaignRequester} from '@/lib/campaigns.js'
import {getCampaignsAction} from '@/server/actions/campaigns.js'

export const metadata = {title: 'Campagnes'}
export const dynamic = 'force-dynamic'

export default async function Page() {
  const result = await getCampaignsAction()
  if (result.code === 403) forbidden()
  const campaigns = result.success ? result.data?.data : null
  if (campaigns?.total === 1 && campaigns.items?.length === 1 && isCampaignRequester(campaigns.items[0].permissions)) redirect(`/campagnes/${campaigns.items[0].id}`)
  return <CampaignList initialData={result.success ? result.data?.data : null} initialError={result.success ? null : result.error} />
}
