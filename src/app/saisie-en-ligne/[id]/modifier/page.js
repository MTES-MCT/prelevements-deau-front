import Link from 'next/link'
import {notFound} from 'next/navigation'
import QuickDeclarationEditor from '@/components/declarations/quick-declaration-editor.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getEditableQuickDeclarationAction} from '@/server/actions/declarations.js'
import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {title: 'Modifier une déclaration en ligne'}

export default async function EditQuickDeclarationPage({params}) {
  const {id} = await params
  const [result, user] = await Promise.all([getEditableQuickDeclarationAction(id), getCurrentUser()])
  if (!result.success || !result.data?.data) {
    if (result.code === 403 || result.code === 404) notFound()
    throw new Error('Impossible de charger la déclaration à modifier.')
  }

  const declaration = result.data.data
  const isAdmin = user.data?.role === 'ADMIN'
  const returnHref = isAdmin ? `/declarations/${declaration.sourceId}` : `/mes-declarations/${id}`
  return (
    <>
      <StartDsfrOnHydration />
      <div className='fr-container fr-py-4w'>
        <Link className='fr-link fr-icon-arrow-left-line fr-link--icon-left' href={returnHref}>Revenir à la déclaration</Link>
        <h1 className='fr-mt-3w'>{isAdmin ? 'Modifier la déclaration' : 'Modifier ma déclaration'}</h1>
        <QuickDeclarationEditor declaration={declaration} returnHref={returnHref} />
      </div>
    </>
  )
}
