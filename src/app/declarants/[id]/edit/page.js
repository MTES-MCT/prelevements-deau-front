import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import PreleveurDeleteSection from '@/components/form/preleveur-delete-section.js'
import PreleveurForm from '@/components/form/preleveur-form.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {
  getDeclarantAction,
  listDeclarantEmailAliasesAction
} from '@/server/actions/index.js'

export async function generateMetadata({params}) {
  const {id} = await params
  const result = await getDeclarantAction(id)

  return buildPageTitle(['Éditer', result.success && result.data ? getDeclarantTitleFromDeclarant(result.data) : null], 'Éditer un déclarant')
}

const Page = async ({params}) => {
  const {id} = await params
  const preleveurResult = await getDeclarantAction(id)

  if (!preleveurResult.success || !preleveurResult.data) {
    notFound()
  }

  const preleveurData = preleveurResult.data

  if (!preleveurData.right?.canEdit) {
    notFound()
  }

  const emailAliasesResult = await listDeclarantEmailAliasesAction(id)

  const preleveur = {
    ...preleveurData,
    emailAliases: emailAliasesResult.success
      ? emailAliasesResult.data?.emailAliases ?? []
      : []
  }

  return (
    <>
      <PreleveurForm
        preleveur={preleveur}
      />
      <PreleveurDeleteSection
        preleveur={preleveur}
      />
    </>
  )
}

export default Page
