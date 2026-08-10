import {CallOut} from '@codegouvfr/react-dsfr/CallOut'
import {forbidden} from 'next/navigation'

import AdminPageShell from '@/components/admin/admin-page-shell.js'
import DeclarationTypesAdmin from '@/components/declaration-types/declaration-types-admin.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {listDeclarationTypesAction} from '@/server/actions/declaration-types.js'
import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {
  title: 'Types de déclaration'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const userResult = await getCurrentUser()

  if (!userResult.success || userResult.data?.role !== 'ADMIN') {
    forbidden()
  }

  const result = await listDeclarationTypesAction()
  const payload = result.success ? result.data : {data: [], meta: {}}

  return (
    <>
      <StartDsfrOnHydration />

      <AdminPageShell
        description='Gérez les formats disponibles sur la plateforme et leur attribution aux déclarants.'
        title='Types de déclaration'
      >
        <CallOut
          iconId='ri-information-line'
          title='À quoi sert cette configuration ?'
        >
          Les déclarants ne peuvent déposer que les types qui sont à la fois actifs sur la plateforme et autorisés
          sur leur fiche déclarant. Désactiver un type bloque les nouveaux dépôts sans supprimer l’historique.
        </CallOut>

        <DeclarationTypesAdmin initialPayload={payload} />
      </AdminPageShell>
    </>
  )
}

export default Page
