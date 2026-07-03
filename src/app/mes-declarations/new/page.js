import {fr} from '@codegouvfr/react-dsfr'

import DeclarationTemplateDownload from '@/components/declarations/declaration-template-download.js'
import NewDeclarationEntry from '@/components/declarations/new-declaration-entry.js'
import {getAllowedDeclarationTypesAction} from '@/server/actions/declarations.js'

export const metadata = {
  title: 'Nouvelle déclaration'
}

export const dynamic = 'force-dynamic'

const TEMPLATE_DECLARATION_TYPE_CODE = 'template-file'

const NouvelleDeclarationPage = async () => {
  const result = await getAllowedDeclarationTypesAction()
  const response = result?.success ? result.data : null
  const allowedDeclarationTypes = response?.data ?? []
  const meta = response?.meta ?? {}
  const hasTemplateDeclarationType = allowedDeclarationTypes.some(
    declarationType => declarationType.code === TEMPLATE_DECLARATION_TYPE_CODE
  )

  return (
    <main className='min-h-screen bg-[#f7f7fb] pb-12'>
      <div className='fr-container pt-6 md:pt-8'>
        <div className='mb-4'>
          <h1 className='fr-h3 fr-mb-1v'>
            Nouvelle déclaration
          </h1>
          <p className='fr-text--sm fr-mb-0 max-w-[760px] text-gray-700'>
            Saisissez vos index, volumes prélevés ou volumes rejetés directement sur la plateforme, ou déposez un fichier de déclaration.
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

      {hasTemplateDeclarationType && (
        <section
          className='mt-6 flex flex-wrap justify-between gap-4 py-6'
          style={{
            backgroundColor: fr.colors.decisions.background.alt.blueFrance.default
          }}
        >
          <div className='fr-container'>
            <h3 className='fr-h5'>
              Besoin du modèle type pour un dépôt de fichier ?
            </h3>
            <DeclarationTemplateDownload />
          </div>
        </section>
      )}
    </main>
  )
}

export default NouvelleDeclarationPage
