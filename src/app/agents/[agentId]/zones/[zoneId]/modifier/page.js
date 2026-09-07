import {notFound} from 'next/navigation'

import AgentZoneAccessEditForm from '@/components/agents/agent-zone-access-edit-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getAgentName} from '@/lib/agents.js'
import {getAgentAction} from '@/server/actions/agents.js'
import {getZoneAgentPermissionsAction} from '@/server/actions/zones.js'

export async function generateMetadata({params}) {
  const {agentId, zoneId} = await params
  const result = await getAgentAction(agentId)
  const habilitation = result.data?.habilitations
    ?.find(item => item.zoneId === zoneId)

  return {
    title: result.success && habilitation
      ? `Modifier ${getAgentName(result.data)} – ${habilitation.zone.name}`
      : 'Modifier un accès agent'
  }
}

export const dynamic = 'force-dynamic'

const EditAgentZonePage = async ({params}) => {
  const {agentId, zoneId} = await params
  const [agentResult, catalogResult] = await Promise.all([
    getAgentAction(agentId),
    getZoneAgentPermissionsAction()
  ])
  const agent = agentResult.data
  const habilitation = agent?.habilitations
    ?.find(item => item.zoneId === zoneId)

  if (!agentResult.success
    || !agent
    || agent.accountStatus !== 'ACTIVE'
    || !habilitation
    || !catalogResult.success
    || !catalogResult.data) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />
      <AgentZoneAccessEditForm
        agent={agent}
        habilitation={habilitation}
        permissionCatalog={catalogResult.data}
      />
    </>
  )
}

export default EditAgentZonePage
