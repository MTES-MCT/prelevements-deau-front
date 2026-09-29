import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {forbidden, notFound} from 'next/navigation'

import CampaignEditor from '@/components/campaigns/campaign-editor.js'
import {getCampaignAction, getCampaignCandidatesAction} from '@/server/actions/campaigns.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'

export const metadata = {title: 'Modifier la campagne'}
export const dynamic = 'force-dynamic'

export default async function Page({params}) {
  const user = await getCurrentSessionInfo()
  if (user.data?.role !== 'ADMIN') forbidden()
  const {id} = await params
  const result = await getCampaignAction(id)
  if (result.code === 404) notFound()
  if (!result.success) return <Alert severity='error' title='Campagne indisponible' description={result.error} />
  const candidates = await getCampaignCandidatesAction({collecteurUserId: result.data.data.campaign.collecteurUserId})
  return <CampaignEditor campaign={result.data.data.campaign} initialCandidates={candidates.success ? candidates.data?.data : null} initialError={candidates.success ? null : candidates.error} />
}
