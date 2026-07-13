import NewDeclarationEntry from '@/components/declarations/new-declaration-entry.js'
import {getAllowedDeclarationTypesAction} from '@/server/actions/declarations.js'

export const metadata = {
  title: 'Nouvelle déclaration'
}

export const dynamic = 'force-dynamic'

const DECLARATION_CREATION_INTRO = 'Saisissez vos index, volumes prélevés ou volumes rejetés directement sur la plateforme, ou déposez un fichier.'

const NouvelleDeclarationPage = async () => {
  const result = await getAllowedDeclarationTypesAction()
  const response = result?.success ? result.data : null
  const allowedDeclarationTypes = response?.data ?? []
  const meta = response?.meta ?? {}
  return (
    <main className='min-h-screen bg-[#f7f7fb] pb-12'>
      <div className='fr-container pt-6 md:pt-8'>
        <div className='mb-4'>
          <h1 className='fr-h3 fr-mb-1v'>
            Nouvelle déclaration
          </h1>
          <p className='fr-text--sm fr-mb-0 text-gray-700'>
            {DECLARATION_CREATION_INTRO}
          </p>
        </div>

        <section className='border border-gray-200 bg-white p-4 md:p-5'>
          <NewDeclarationEntry
            allowedDeclarationTypes={allowedDeclarationTypes}
            availablePreleveurs={meta.preleveurs ?? []}
            declarantRole={meta.declarantRole}
            quickDeclarationEnabled={meta.quickDeclarationEnabled}
            canCreateQuickDeclaration={meta.canCreateQuickDeclaration}
          />
        </section>
      </div>

    </main>
  )
}

export default NouvelleDeclarationPage
