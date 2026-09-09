import {forbidden} from 'next/navigation'

import AdminPageShell from '@/components/admin/admin-page-shell.js'
import CampaignList from '@/components/campaigns/campaign-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {unwrapCampaignResult} from '@/lib/collection-campaigns.js'
import {listCampaignsAction} from '@/server/actions/campaigns.js'
import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {title: 'Campagnes — Administration'}
export const dynamic = 'force-dynamic'

const AdministrationCampaignsPage = async () => {
  const userResult = await getCurrentUser()
  if (!userResult.success || userResult.data?.role !== 'ADMIN') {
    forbidden()
  }

  let data
  let error
  try {
    data = unwrapCampaignResult(await listCampaignsAction())
  } catch (error_) {
    error = error_.message
  }

  return (
    <>
      <StartDsfrOnHydration />
      <AdminPageShell title='Campagnes de collecte' description='Préparez les demandes de relevés et de besoins en eau, puis suivez les réponses.'>
        <CampaignList embedded data={data} error={error} />
      </AdminPageShell>
    </>
  )
}

export default AdministrationCampaignsPage
