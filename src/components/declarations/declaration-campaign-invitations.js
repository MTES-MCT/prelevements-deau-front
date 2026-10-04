import {Alert} from '@codegouvfr/react-dsfr/Alert'

import {CampaignInvitations} from '@/components/campaigns/campaign-common.js'
import {isCampaignRequester} from '@/lib/campaigns.js'
import {getCampaignSummaryAction} from '@/server/actions/campaigns.js'

// Load independently so an unavailable campaign never hides existing declarations.
export default async function DeclarationCampaignInvitations() {
  const result = await getCampaignSummaryAction()
  if (!result?.success) return <Alert className='mb-4' severity='info' title='Campagnes indisponibles' description='Les campagnes n’ont pas pu être chargées. Rechargez la page pour réessayer.' />
  const summary = result.data?.data
  return <CampaignInvitations summary={{...summary, items: summary?.items?.filter(campaign => isCampaignRequester(campaign.permissions)) || []}} />
}
