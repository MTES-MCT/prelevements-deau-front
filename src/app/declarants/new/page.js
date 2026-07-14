import dynamic from 'next/dynamic'
import {forbidden} from 'next/navigation'

import PreleveurForm from '@/components/form/preleveur-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getZoneOptionsForPermissionAction} from '@/server/actions/zones.js'

const DynamicBreadcrumb = dynamic(
  () => import('@codegouvfr/react-dsfr/Breadcrumb')
)

export const metadata = {
  title: 'Nouveau déclarant'
}

const Page = async ({searchParams}) => {
  const resolvedSearchParams = await searchParams
  const requestedZoneId = typeof resolvedSearchParams?.zoneId === 'string'
    ? resolvedSearchParams.zoneId
    : null
  const [zonesResult, inviteZonesResult] = await Promise.all([
    getZoneOptionsForPermissionAction('declarant.create'),
    getZoneOptionsForPermissionAction('declarant.invite')
  ])
  const zones = zonesResult.success && Array.isArray(zonesResult.data) ? zonesResult.data : []
  const inviteZoneIds = inviteZonesResult.success && Array.isArray(inviteZonesResult.data)
    ? inviteZonesResult.data.map(zone => zone.id)
    : []
  const requestedZoneIsAllowed = !requestedZoneId || zones.some(zone => zone.id === requestedZoneId)

  if (zones.length === 0 || !requestedZoneIsAllowed) {
    forbidden()
  }

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container'>
        <DynamicBreadcrumb
          currentPageLabel='Création'
          homeLinkProps={{
            href: '/'
          }}
          segments={[
            {
              label: 'Déclarants',
              linkProps: {
                href: '/declarants'
              }
            }
          ]}
        />
      </div>
      <PreleveurForm
        initialZoneIds={requestedZoneId ? [requestedZoneId] : []}
        inviteZoneIds={inviteZoneIds}
        zones={zones}
      />
    </>
  )
}

export default Page
