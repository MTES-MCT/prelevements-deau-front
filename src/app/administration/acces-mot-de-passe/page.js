import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {forbidden, notFound} from 'next/navigation'

import AdminPageShell from '@/components/admin/admin-page-shell.js'
import PasswordAccessesAdmin from '@/components/admin/password-accesses-admin.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {AUTH_METHODS} from '@/lib/auth-methods.js'
import {getPasswordAccessCurrentUserId} from '@/lib/password-accesses.js'
import {listPasswordAccessesAction} from '@/server/actions/password-accesses.js'
import {getCurrentUser} from '@/server/actions/user.js'
import {getAuthConfigState} from '@/server/auth-config.js'

export const metadata = {
  title: 'Accès par mot de passe'
}

export const dynamic = 'force-dynamic'

const Page = async ({searchParams}) => {
  const userResult = await getCurrentUser()

  if (!userResult.success || userResult.data?.role !== 'ADMIN') {
    forbidden()
  }

  const parameters = await searchParams
  const authConfigState = await getAuthConfigState()
  const currentUserId = getPasswordAccessCurrentUserId(userResult.data)

  if (authConfigState.available && !authConfigState.config.methods.includes(AUTH_METHODS.PASSWORD)) {
    notFound()
  }

  const search = typeof parameters?.recherche === 'string' ? parameters.recherche : ''
  const result = authConfigState.available
    ? await listPasswordAccessesAction({search})
    : null

  return (
    <>
      <StartDsfrOnHydration />

      <AdminPageShell
        description='Activez, réinitialisez ou révoquez les accès par mot de passe des comptes existants.'
        title='Accès par mot de passe'
      >
        {!authConfigState.available && (
          <Alert
            severity='error'
            title='Configuration indisponible'
            description='Les méthodes d’authentification n’ont pas pu être chargées.'
          />
        )}

        {authConfigState.available && !result?.success && (
          <Alert
            severity='error'
            title='Chargement impossible'
            description={result?.error || 'Les accès par mot de passe n’ont pas pu être chargés.'}
          />
        )}

        {result?.success && !currentUserId && (
          <Alert
            severity='error'
            title='Actions indisponibles'
            description='Votre identité n’a pas pu être vérifiée. Rechargez la page avant de gérer les accès par mot de passe.'
          />
        )}

        {result?.success && currentUserId && (
          <PasswordAccessesAdmin
            accesses={result.data?.items || []}
            currentUserId={currentUserId}
            initialSearch={search}
          />
        )}
      </AdminPageShell>
    </>
  )
}

export default Page
