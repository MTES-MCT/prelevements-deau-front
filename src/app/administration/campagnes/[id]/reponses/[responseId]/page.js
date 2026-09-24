import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {forbidden, notFound} from 'next/navigation'

import CampaignResponseForm from '@/components/campaigns/campaign-response-form.js'
import {getCampaignResponseAction} from '@/server/actions/campaigns.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'

export const metadata = {title: 'Réponse à la campagne'}
export const dynamic = 'force-dynamic'

export default async function Page({params}) {
  const user = await getCurrentSessionInfo()
  if (user.data?.role !== 'ADMIN') forbidden()
  const {id, responseId} = await params
  const result = await getCampaignResponseAction(id, responseId)
  if (result.code === 403) forbidden()
  if (result.code === 404) notFound()
  if (!result.success) return <Alert severity='error' title='Réponse indisponible' description={result.error} />
  return <CampaignResponseForm admin initialContext={result.data.data} />
}
