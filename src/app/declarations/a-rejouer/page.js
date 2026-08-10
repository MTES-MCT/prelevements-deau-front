import {forbidden} from 'next/navigation'

import AdminPageShell from '@/components/admin/admin-page-shell.js'
import ReplayableDeclarationsPanel from '@/components/declarations/instruction/replayable-declarations-panel.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {
  title: 'Déclarations à rejouer'
}

export const dynamic = 'force-dynamic'

const ReplayableDeclarationsPage = async () => {
  const userResult = await getCurrentUser()

  if (!userResult.success || userResult.data?.role !== 'ADMIN') {
    forbidden()
  }

  return (
    <>
      <StartDsfrOnHydration />

      <AdminPageShell
        description='Vérifiez et relancez les dépôts dont le traitement n’a produit aucune source exploitable.'
        title='Déclarations à rejouer'
      >
        <ReplayableDeclarationsPanel />
      </AdminPageShell>
    </>
  )
}

export default ReplayableDeclarationsPage
