import {forbidden} from 'next/navigation'

import AdminPageShell from '@/components/admin/admin-page-shell.js'
import DeclarationNotificationsAdmin from '@/components/declaration-notifications/declaration-notifications-admin.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  listDeclarationNotificationRunsAction,
  listUpcomingDeclarationNotificationsAction
} from '@/server/actions/declaration-notifications.js'
import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {
  title: 'Notifications de déclaration | Partageons l’eau'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const userResult = await getCurrentUser()

  if (!userResult.success || userResult.data?.role !== 'ADMIN') {
    forbidden()
  }

  const [upcomingResult, runsResult] = await Promise.all([
    listUpcomingDeclarationNotificationsAction(),
    listDeclarationNotificationRunsAction({limit: 100})
  ])

  const upcoming = upcomingResult.success ? (upcomingResult.data.data || upcomingResult.data) : []
  const runs = runsResult.success ? (runsResult.data.data || runsResult.data) : []

  return (
    <>
      <StartDsfrOnHydration />

      <AdminPageShell
        description='Suivez les rappels et relances automatiques envoyés via Brevo.'
        title='Notifications de déclaration'
      >
        <DeclarationNotificationsAdmin upcoming={upcoming} runs={runs} />
      </AdminPageShell>
    </>
  )
}

export default Page
