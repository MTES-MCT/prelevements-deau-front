import {notFound} from 'next/navigation'

import AgentDetail from '@/components/agents/agent-detail.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getAgentName} from '@/lib/agents.js'
import {getAgentAction} from '@/server/actions/agents.js'
import {getZoneAgentPermissionsAction} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {agentId} = await params
  const result = await getAgentAction(agentId)

  return {
    title: result.success && result.data ? getAgentName(result.data) : 'Agent'
  }
}

export const dynamic = 'force-dynamic'

const AgentPage = async ({params, searchParams}) => {
  const {agentId} = await params
  const [result, catalogResult, resolvedSearchParams] = await Promise.all([
    getAgentAction(agentId),
    getZoneAgentPermissionsAction(),
    searchParams
  ])

  if (!result.success || !result.data) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />
      <AgentDetail
        agent={result.data}
        messageKey={resolvedSearchParams?.created || resolvedSearchParams?.updated}
        permissionCatalog={catalogResult.success ? catalogResult.data : null}
      />
    </>
  )
}

export default AgentPage
