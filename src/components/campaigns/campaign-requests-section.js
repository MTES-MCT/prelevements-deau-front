import CampaignRequests from '@/components/campaigns/campaign-requests.js'
import {unwrapCampaignResult} from '@/lib/collection-campaigns.js'
import {listCampaignRequestsAction} from '@/server/actions/campaigns.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'

const CampaignRequestsSection = async () => {
  const session = await getCurrentSessionInfo()
  if (!session.success || session.data?.role !== 'DECLARANT') {
    return null
  }

  let data
  let error
  try {
    data = unwrapCampaignResult(await listCampaignRequestsAction())
  } catch (error_) {
    error = error_.message
  }

  return <CampaignRequests initialData={data} initialError={error} showPreleveur={session.data?.declarantRole === 'COLLECTEUR'} now={Date.now()} />
}

export default CampaignRequestsSection
