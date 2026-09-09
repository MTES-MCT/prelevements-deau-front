import {CampaignDetailPage} from '@/components/campaigns/campaign-pages.js'

export const metadata = {title: 'Mes index de prélèvement'}
export const dynamic = 'force-dynamic'

const Page = async ({params, searchParams}) => {
  const {id} = await params
  const {preleveurUserId} = await searchParams
  return <CampaignDetailPage id={id} kind='INDEX' preleveurUserId={preleveurUserId} />
}

export default Page
