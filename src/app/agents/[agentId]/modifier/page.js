import {notFound} from 'next/navigation'

import AgentProfileForm from '@/components/agents/agent-profile-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getAgentName} from '@/lib/agents.js'
import {getAgentAction} from '@/server/actions/agents.js'

export async function generateMetadata({params}) {
  const {agentId} = await params
  const result = await getAgentAction(agentId)

  return {
    title: result.success && result.data
      ? `Modifier ${getAgentName(result.data)}`
      : 'Modifier un agent'
  }
}

export const dynamic = 'force-dynamic'

const EditAgentPage = async ({params}) => {
  const {agentId} = await params
  const result = await getAgentAction(agentId)

  if (!result.success || !result.data) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />
      <AgentProfileForm agent={result.data} />
    </>
  )
}

export default EditAgentPage
