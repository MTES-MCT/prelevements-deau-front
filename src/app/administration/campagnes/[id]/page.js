import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {forbidden, notFound} from 'next/navigation'

import CampaignDetail from '@/components/campaigns/campaign-detail.js'
import {getCampaignAction, getCampaignResponsesAction} from '@/server/actions/campaigns.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'

export const metadata = {title: 'Campagne de collecte'}
export const dynamic = 'force-dynamic'

export default async function Page({params}) {
  const user = await getCurrentSessionInfo()
  if (user.data?.role !== 'ADMIN') forbidden()
  const {id} = await params
  const result = await getCampaignAction(id)
  if (result.code === 404) notFound()
  if (!result.success) return <Alert severity='error' title='Campagne indisponible' description={result.error} />
  const responses = await getCampaignResponsesAction(id)
  return <CampaignDetail admin key={`${id}-${result.data.data.campaign.updatedAt}`} initialData={result.data.data} initialResponses={responses.success ? responses.data?.data : null} initialError={responses.success ? null : responses.error} />
}
