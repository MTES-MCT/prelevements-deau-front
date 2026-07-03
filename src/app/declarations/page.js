import DeclarationTabs from '@/components/declarations/instruction/declaration-tabs.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

export const metadata = {
  title: 'Déclarations'
}

export const dynamic = 'force-dynamic'

const Declarations = async () => (
  <>
    <StartDsfrOnHydration />

    <main className='min-h-screen bg-[#f7f7fb] pb-12'>
      <div className='fr-container pt-8 md:pt-10'>
        <div className='mb-6'>
          <h1 className='fr-h2 fr-mb-2w'>Déclarations</h1>
          <p className='fr-text--sm fr-mb-0 max-w-[760px] text-gray-700'>
            Consultez les déclarations déposées et suivez le rapprochement des points de prélèvement détectés
            dans les fichiers.
          </p>
        </div>

        <DeclarationTabs />
      </div>
    </main>
  </>
)

export default Declarations
