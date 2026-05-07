import NewDeclarationForm from '@/components/declarations/new-declaration-form.js'
import {getAllowedDeclarationTypesAction} from '@/server/actions/declarations.js'

export const dynamic = 'force-dynamic'

const NouvelleDeclarationPage = async () => {
  const result = await getAllowedDeclarationTypesAction()
  const allowedDeclarationTypes = result?.success ? result.data?.data ?? [] : []

  return <NewDeclarationForm allowedDeclarationTypes={allowedDeclarationTypes} />
}

export default NouvelleDeclarationPage
