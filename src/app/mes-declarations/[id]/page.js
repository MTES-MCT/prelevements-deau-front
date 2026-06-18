import {notFound} from 'next/navigation'

import MyDeclarationDetail from '@/components/declarations/my-declaration-detail.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarationAction} from '@/server/actions/declarations.js'

const Page = async ({params}) => {
  const {id} = await params

  const result = await getDeclarationAction(id)
  if (!result.success || !result.data) {
    notFound()
  }

  const declaration = result.data.data

  return (
    <>
      <StartDsfrOnHydration />
      <MyDeclarationDetail initialDeclaration={declaration} />
    </>
  )
}

export default Page
