import {CallOut} from '@codegouvfr/react-dsfr/CallOut'
import Link from 'next/link'

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

      <div className='fr-container fr-my-4w'>
        <div className='flex justify-between gap-3 items-start flex-wrap fr-mb-3w'>
          <div className='max-w-3xl'>
            <CallOut
              iconId='fr-icon-lock-line'
              title='Comptes de service'
            >
              Pilotez les accès techniques et leurs identifiants.
              Un compte actif peut traiter tous les déclarants actifs.
              Les comptes supprimés restent visibles pour garder une traçabilité claire.
            </CallOut>
          </div>
          <Link className='fr-btn fr-btn--icon-left fr-icon-add-line' href='/comptes-service/nouveau'>
            Nouveau compte
          </Link>
        </div>

        <ServiceAccountsList serviceAccounts={serviceAccounts} />
      </div>
    </>
  )
}

export default Page
