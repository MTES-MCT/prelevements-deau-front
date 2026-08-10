import {forbidden} from 'next/navigation'

import {getCurrentUser} from '@/server/actions/user.js'

const ServiceAccountsLayout = async ({children}) => {
  const userResult = await getCurrentUser()

  if (!userResult.success || userResult.data?.role !== 'ADMIN') {
    forbidden()
  }

  return children
}

export default ServiceAccountsLayout
