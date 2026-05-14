import {Box} from '@mui/material'

import EntityHeader from '@/components/ui/EntityHeader/index.js'
import ZoneBreadcrumb from '@/components/zones/zone-breadcrumb.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import ZonesList from '@/components/zones/zones-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getZonesAction} from '@/server/actions/zones.js'

export const dynamic = 'force-dynamic'

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

const Page = async () => {
  const result = await getZonesAction()
  const zones = result.data || []
  const adminZonesCount = zones.filter(zone => zone.isAdmin).length

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <ZoneBreadcrumb currentPageLabel='Mes zones' />

        <EntityHeader
          title={(
            <>
              <span className={ZONE_ICONS.mapPin2} />
              {' '}
              Mes zones
            </>
          )}
          tags={[]}
          rightBadges={[]}
          hrefButtons={[]}
          metas={[
            {
              iconId: ZONE_ICONS.mapPin,
              content: pluralize(zones.length, 'zone')
            },
            {
              iconId: ZONE_ICONS.shieldCheck,
              content: pluralize(adminZonesCount, 'zone administrée', 'zones administrées')
            }
          ]}
        />

        <ZonesList zones={zones} />
      </Box>
    </>
  )
}

export default Page
