import {redirect} from 'next/navigation'

import {CampaignListPage} from '@/components/campaigns/campaign-pages.js'
import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {title: 'Campagnes de collecte'}
export const dynamic = 'force-dynamic'

const Page = async () => {
  const userResult = await getCurrentUser()
  if (userResult.success && userResult.data?.role === 'ADMIN' && !userResult.data.impersonation?.active) {
    redirect('/administration/campagnes')
  }

  return <CampaignListPage />
}

export default Page
