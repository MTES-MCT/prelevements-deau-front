import {forbidden} from 'next/navigation'

import AuditEventsPage from '@/components/admin/audit-events-page.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {normalizeAuditFilters} from '@/lib/audit-events.js'
import {
  getAuditEventOptionsAction,
  getAuditEventsAction
} from '@/server/actions/audit-events.js'
import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {
  title: 'Journal d’audit'
}

export const dynamic = 'force-dynamic'

const AuditLogPage = async ({searchParams}) => {
  const userResult = await getCurrentUser()

  if (!userResult.success || userResult.data?.role !== 'ADMIN') {
    forbidden()
  }

  const filters = normalizeAuditFilters(await searchParams)
  const [eventsResult, optionsResult] = await Promise.all([
    getAuditEventsAction(filters),
    getAuditEventOptionsAction()
  ])

  return (
    <>
      <StartDsfrOnHydration />
      <AuditEventsPage
        initialData={eventsResult.success ? eventsResult.data?.data : null}
        initialError={eventsResult.success ? null : eventsResult.error}
        initialFilters={filters}
        options={optionsResult.success ? optionsResult.data?.data : null}
      />
    </>
  )
}

export default AuditLogPage
