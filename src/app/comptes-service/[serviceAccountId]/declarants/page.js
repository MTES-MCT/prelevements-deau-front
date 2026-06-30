import {redirect} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'

export function generateMetadata() {
  return buildPageTitle(['Compte de service'], 'Compte de service')
}

export const dynamic = 'force-dynamic'

const Page = async ({params}) => {
  const {serviceAccountId} = await params
  redirect(`/comptes-service/${serviceAccountId}`)
}

export default Page
