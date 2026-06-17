import {notFound} from 'next/navigation'

import PreleveurDeleteSection from '@/components/form/preleveur-delete-section.js'
import PreleveurForm from '@/components/form/preleveur-form.js'
import {
  getDeclarantAction,
  listDeclarantEmailAliasesAction
} from '@/server/actions/index.js'

const Page = async ({params}) => {
  const {id} = await params
  const preleveurResult = await getDeclarantAction(id)

  if (!preleveurResult.success || !preleveurResult.data) {
    notFound()
  }

  const emailAliasesResult = await listDeclarantEmailAliasesAction(id)

  const preleveur = {
    ...preleveurResult.data,
    emailAliases: emailAliasesResult.success
      ? emailAliasesResult.data?.emailAliases ?? []
      : []
  }

  if (!preleveur.right?.canEdit) {
    notFound()
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
