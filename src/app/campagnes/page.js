import {forbidden} from 'next/navigation'

import CampaignList from '@/components/campaigns/campaign-list.js'
import {getCampaignsAction} from '@/server/actions/campaigns.js'

export const metadata = {title: 'Campagnes'}
export const dynamic = 'force-dynamic'

export default async function Page() {
  const result = await getCampaignsAction()
  if (result.code === 403) forbidden()
  return <CampaignList initialData={result.success ? result.data?.data : null} initialError={result.success ? null : result.error} />
}
