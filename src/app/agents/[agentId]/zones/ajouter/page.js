import {notFound} from 'next/navigation'

import AgentZoneAccessForm from '@/components/agents/agent-zone-access-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getAgentName} from '@/lib/agents.js'
import {getAgentAction} from '@/server/actions/agents.js'
import {
  getZoneAgentPermissionsAction,
  getZoneOptionsForPermissionAction
} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {agentId} = await params
  const result = await getAgentAction(agentId)

  return {
    title: result.success && result.data
      ? `Ajouter une zone à ${getAgentName(result.data)}`
      : 'Ajouter une zone'
  }
}

export const dynamic = 'force-dynamic'

const AddAgentZonePage = async ({params}) => {
  const {agentId} = await params
  const [agentResult, zonesResult, catalogResult] = await Promise.all([
    getAgentAction(agentId),
    getZoneOptionsForPermissionAction('zone.agent.create'),
    getZoneAgentPermissionsAction()
  ])

  if (!agentResult.success || !agentResult.data
    || agentResult.data.accountStatus !== 'ACTIVE'
    || !zonesResult.success || !catalogResult.success || !catalogResult.data) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />
      <AgentZoneAccessForm
        agent={agentResult.data}
        permissionCatalog={catalogResult.data}
        zones={Array.isArray(zonesResult.data) ? zonesResult.data : []}
      />
    </>
  )
}

export default AddAgentZonePage
