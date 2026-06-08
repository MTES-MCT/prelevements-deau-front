import NewDeclarationForm from '@/components/declarations/new-declaration-form.js'
import {getAllowedDeclarationTypesAction} from '@/server/actions/declarations.js'

export const dynamic = 'force-dynamic'

const NouvelleDeclarationPage = async () => {
  const result = await getAllowedDeclarationTypesAction()
  const response = result?.success ? result.data : null
  const allowedDeclarationTypes = response?.data ?? []
  const meta = response?.meta ?? {}

  return (
    <NewDeclarationForm
      allowedDeclarationTypes={allowedDeclarationTypes}
      availablePreleveurs={meta.preleveurs ?? []}
      declarantRole={meta.declarantRole}
    />
  )
}

export default NouvelleDeclarationPage
