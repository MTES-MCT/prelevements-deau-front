import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import PreleveurForm from '@/components/form/preleveur-form.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {
  getDeclarantOverviewAction,
  listDeclarantContactEmailsAction,
  listDeclarantEmailAliasesAction
} from '@/server/actions/index.js'

export async function generateMetadata({params}) {
  const {id} = await params
  const result = await getDeclarantOverviewAction(id)

  return buildPageTitle(['Éditer', result.success && result.data ? getDeclarantTitleFromDeclarant(result.data) : null], 'Éditer un déclarant')
}

const Page = async ({params}) => {
  const {id} = await params
  const preleveurResult = await getDeclarantOverviewAction(id)

  if (!preleveurResult.success || !preleveurResult.data) {
    notFound()
  }

  const preleveurData = preleveurResult.data

  if (!preleveurData.right?.canEdit) {
    notFound()
  }

  const permissions = new Set(preleveurData.right?.permissions || [])
  const [contactEmailsResult, emailAliasesResult] = await Promise.all([
    listDeclarantContactEmailsAction(id),
    permissions.has('declarant.email-alias.read')
      ? listDeclarantEmailAliasesAction(id)
      : Promise.resolve({success: true, data: {emailAliases: []}})
  ])

  const preleveur = {
    ...preleveurData,
    contactEmails: contactEmailsResult.success
      ? contactEmailsResult.data?.contactEmails ?? []
      : preleveurData.contactEmails ?? [],
    emailAliases: emailAliasesResult.success
      ? emailAliasesResult.data?.emailAliases ?? []
      : []
  }

  return (
    <PreleveurForm
      preleveur={preleveur}
    />
  )
}

export default Page
