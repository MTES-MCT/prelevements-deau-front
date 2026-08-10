import {CallOut} from '@codegouvfr/react-dsfr/CallOut'
import Link from 'next/link'

import AdminPageShell from '@/components/admin/admin-page-shell.js'
import ServiceAccountsList from '@/components/service-accounts/service-accounts-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {listServiceAccountsAction} from '@/server/actions/service-accounts.js'

export const metadata = {
  title: 'Comptes de service'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const serviceAccountsResult = await listServiceAccountsAction({includeDeleted: true})
  const serviceAccounts = serviceAccountsResult.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <AdminPageShell
        actions={(
          <Link className='fr-btn fr-btn--icon-left fr-icon-add-line' href='/comptes-service/nouveau'>
            Nouveau compte
          </Link>
        )}
        description='Pilotez les accès techniques et leurs identifiants.'
        title='Comptes de service'
      >
        <CallOut iconId='fr-icon-lock-line' title='Accès techniques'>
          Un compte actif peut traiter tous les déclarants actifs. Les comptes supprimés restent visibles pour
          conserver leur traçabilité.
        </CallOut>

        <ServiceAccountsList serviceAccounts={serviceAccounts} />
      </AdminPageShell>
    </>
  )
}

export default Page
