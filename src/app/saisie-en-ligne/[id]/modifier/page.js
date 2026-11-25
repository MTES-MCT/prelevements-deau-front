import Link from 'next/link'
import {notFound} from 'next/navigation'
import QuickDeclarationForm from '@/components/declarations/quick-declaration-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {formatQuickDate} from '@/lib/quick-declaration-review.js'
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
      <main className='min-h-screen bg-[#f7f7fb] pb-12'>
        <div className='fr-container pt-6 md:pt-8'>
          <div className='mb-4'>
            <Link className='fr-link fr-icon-arrow-left-line fr-link--icon-left' href={returnHref}>Revenir à la déclaration</Link>
            <h1 className='fr-h3 fr-mt-3w fr-mb-1v'>{isAdmin ? 'Modifier la déclaration' : 'Modifier ma déclaration'}</h1>
            <p className='fr-text--sm fr-mb-0 text-gray-700'>
              Déclaration n°{declaration.code} · saisie le {formatQuickDate(declaration.createdAt?.slice(0, 10))}.
              {declaration.entries.length > 0 && ' Utilisez le crayon de la ligne pour corriger sa valeur.'}
            </p>
          </div>
          <section className='border border-gray-200 bg-white p-4 md:p-5'>
            <QuickDeclarationForm key={declaration.id} declaration={declaration} returnHref={returnHref} />
          </section>
        </div>
      </main>
    </>
  )
}
