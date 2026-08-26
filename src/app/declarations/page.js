import {forbidden} from 'next/navigation'

import DeclarationTabs from '@/components/declarations/instruction/declaration-tabs.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getDeclarationInstructionFilters,
  getDeclarationInstructionRequestOptions
} from '@/lib/declaration-instruction-filters.js'
import {getMySourcesAction} from '@/server/actions/sources.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'

export const metadata = {
  title: 'Déclarations'
}

export const dynamic = 'force-dynamic'

const Declarations = async ({searchParams}) => {
  const filters = getDeclarationInstructionFilters(await searchParams)
  const userResult = await getCurrentSessionInfo()
  if (userResult.data?.role === 'INSTRUCTOR'
    && !userResult.data?.permissions?.includes('declaration.list')) {
    forbidden()
  }

  const sourcesResult = await getMySourcesAction(
    getDeclarationInstructionRequestOptions(filters)
  )
  const initialPayload = sourcesResult.success
    ? sourcesResult.data?.data
    : null

  return (
    <>
      <StartDsfrOnHydration />

      <main className='min-h-screen bg-[#f7f7fb] pb-12'>
        <div className='fr-container pt-8 md:pt-10'>
          <div className='mb-6'>
            <h1 className='fr-h2 fr-mb-2w'>Déclarations</h1>
            <p className='fr-text--sm fr-mb-0 text-gray-700'>
              Consultez les déclarations déposées et suivez le rapprochement des points de prélèvement détectés
              dans les fichiers.
            </p>
          </div>

          <DeclarationTabs
            initialError={sourcesResult.success ? null : sourcesResult.error}
            initialPayload={initialPayload}
          />
        </div>
      </main>
    </>
  )
}

export default Declarations
