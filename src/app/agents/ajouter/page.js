import {notFound} from 'next/navigation'

import AgentCreateForm from '@/components/agents/agent-create-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getZoneAgentPermissionsAction,
  getZoneOptionsForPermissionAction
} from '@/server/actions/zones.js'

export const metadata = {
  title: 'Ajouter un agent'
}

export const dynamic = 'force-dynamic'

const AddAgentPage = async () => {
  const [zonesResult, catalogResult] = await Promise.all([
    getZoneOptionsForPermissionAction('zone.agent.create'),
    getZoneAgentPermissionsAction()
  ])

  if (!zonesResult.success || !catalogResult.success || !catalogResult.data) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />
      <AgentCreateForm
        permissionCatalog={catalogResult.data}
        zones={Array.isArray(zonesResult.data) ? zonesResult.data : []}
      />
    </>
  )
}

export default AddAgentPage
