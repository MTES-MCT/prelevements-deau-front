import {forbidden} from 'next/navigation'

import AdminDashboard from '@/components/admin/admin-dashboard.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getAdminDashboardAction} from '@/server/actions/admin-dashboard.js'
import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {
  title: 'Administration'
}

export const dynamic = 'force-dynamic'

const AdministrationPage = async ({searchParams}) => {
  const userResult = await getCurrentUser()

  if (!userResult.success || userResult.data?.role !== 'ADMIN') {
    forbidden()
  }

  const parameters = await searchParams
  const startDate = Array.isArray(parameters?.startDate) ? parameters.startDate[0] : parameters?.startDate
  const endDate = Array.isArray(parameters?.endDate) ? parameters.endDate[0] : parameters?.endDate
  const dashboardResult = await getAdminDashboardAction({startDate, endDate})

  return (
    <>
      <StartDsfrOnHydration />
      <AdminDashboard
        initialData={dashboardResult.success ? dashboardResult.data?.data : null}
        initialError={dashboardResult.success ? null : dashboardResult.error}
      />
    </>
  )
}

export default AdministrationPage
