import Link from 'next/link'

import ReplayableDeclarationsPanel from '@/components/declarations/instruction/replayable-declarations-panel.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

export const metadata = {
  title: 'Déclarations à rejouer'
}

export const dynamic = 'force-dynamic'

const ReplayableDeclarationsPage = async () => (
  <>
    <StartDsfrOnHydration />

    <main className='min-h-screen bg-[#f7f7fb] pb-12'>
      <div className='fr-container pt-8 md:pt-10'>
        <div className='mb-6'>
          <Link className='fr-link fr-icon-arrow-left-line fr-link--icon-left fr-mb-2w' href='/declarations'>
            Retour aux déclarations
          </Link>
          <h1 className='fr-h2 fr-mb-2w'>Déclarations à rejouer</h1>
          <p className='fr-text--sm fr-mb-0 text-gray-700'>
            Ces dépôts ont des fichiers mais aucune source exploitable associée après traitement.
          </p>
        </div>

        <ReplayableDeclarationsPanel />
      </div>
    </main>
  </>
)

export default ReplayableDeclarationsPage
