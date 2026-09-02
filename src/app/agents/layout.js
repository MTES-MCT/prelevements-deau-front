import {forbidden} from 'next/navigation'

import {getCurrentSessionInfo} from '@/server/actions/user.js'

const AgentsLayout = async ({children}) => {
  const userResult = await getCurrentSessionInfo()
  const session = userResult.data

  if (!userResult.success
    || session?.role !== 'ADMIN'
    || session.impersonation?.active) {
    forbidden()
  }

  return children
}

export default AgentsLayout
