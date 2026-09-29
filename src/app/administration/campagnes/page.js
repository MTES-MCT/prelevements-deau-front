import {forbidden} from 'next/navigation'

import CampaignList from '@/components/campaigns/campaign-list.js'
import {getCampaignsAction} from '@/server/actions/campaigns.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'

export const metadata = {title: 'Campagnes'}
export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentSessionInfo()
  if (user.data?.role !== 'ADMIN') forbidden()
  const result = await getCampaignsAction()
  return <CampaignList admin initialData={result.success ? result.data?.data : null} initialError={result.success ? null : result.error} />
}
