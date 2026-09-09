import {CampaignDetailPage} from '@/components/campaigns/campaign-pages.js'

export const metadata = {title: 'Détail de la campagne'}
export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {id} = await params
  return <CampaignDetailPage id={id} />
}

export default Page
