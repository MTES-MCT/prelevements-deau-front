import DeclarationNotificationsAdmin from '@/components/declaration-notifications/declaration-notifications-admin.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  listDeclarationNotificationRunsAction,
  listUpcomingDeclarationNotificationsAction
} from '@/server/actions/declaration-notifications.js'

export const metadata = {
  title: 'Notifications de déclaration | Partageons l’eau'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const [upcomingResult, runsResult] = await Promise.all([
    listUpcomingDeclarationNotificationsAction(),
    listDeclarationNotificationRunsAction({limit: 100})
  ])

  const upcoming = upcomingResult.success ? (upcomingResult.data.data || upcomingResult.data) : []
  const runs = runsResult.success ? (runsResult.data.data || runsResult.data) : []

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container fr-py-5w'>
        <div className='fr-mb-4w'>
          <h1 className='fr-h2 fr-mb-1w'>Notifications de déclaration</h1>
          <p className='fr-text--sm fr-mb-0'>
            Suivez les rappels et relances automatiques envoyés via Brevo.
          </p>
        </div>

        <DeclarationNotificationsAdmin upcoming={upcoming} runs={runs} />
      </div>
    </>
  )
}

export default Page
