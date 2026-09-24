import {forbidden} from 'next/navigation'

import CampaignEditor from '@/components/campaigns/campaign-editor.js'
import {getCampaignCandidatesAction} from '@/server/actions/campaigns.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'

export const metadata = {title: 'Créer une campagne'}
export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentSessionInfo()
  if (user.data?.role !== 'ADMIN') forbidden()
  const result = await getCampaignCandidatesAction()
  return <CampaignEditor initialCandidates={result.success ? result.data?.data : null} initialError={result.success ? null : result.error} />
}
