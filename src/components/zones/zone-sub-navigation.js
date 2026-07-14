'use client'

import {Box} from '@mui/material'
import Link from 'next/link'

const ITEMS = [
  {
    key: 'overview',
    label: 'Vue d’ensemble',
    permission: 'zone.detail.read',
    href: zone => `/zones/${zone.id}`
  },
  {
    key: 'points',
    label: 'Points de prélèvement',
    permission: 'pp.list',
    href: zone => `/zones/${zone.id}/points-prelevement`
  },
  {
    key: 'monitoring-stations',
    label: 'Paramétrage des ressources',
    permission: 'zone.resource.list',
    href: zone => `/zones/${zone.id}/parametres-ressources`
  },
  {
    key: 'declarants',
    label: 'Déclarants',
    permission: 'declarant.list',
    href: zone => `/zones/${zone.id}/declarants`
  },
  {
    key: 'collecteurs',
    label: 'Collecteurs',
    permission: 'declarant.list',
    href: zone => `/zones/${zone.id}/collecteurs`
  },
  {
    key: 'exploitations',
    label: 'Exploitations',
    permission: 'exploitation.list',
    href: zone => `/zones/${zone.id}/exploitations`
  },
  {
    key: 'suivi-declarations',
    label: 'Suivi déclarations',
    permission: 'declaration.followup.read',
    href: zone => `/zones/${zone.id}/suivi-declarations`
  },
  {
    key: 'declaration-settings',
    label: 'Paramètres déclaration',
    permission: 'zone.declaration.settings.read',
    href: zone => `/zones/${zone.id}/parametres-declaration`
  },
  {
    key: 'agents',
    label: 'Agents',
    permission: 'zone.agent.list',
    href: zone => `/zones/${zone.id}/agents`
  }
]

const ZoneSubNavigation = ({zone, current}) => (
  <Box
    className='fr-mb-2w'
    sx={{
      borderBottom: '1px solid var(--border-default-grey)'
    }}
  >
    <nav aria-label='Navigation de la zone'>
      <ul className='flex gap-1 flex-wrap fr-mb-0 p-0 list-none'>
        {ITEMS.filter(item => zone.permissions?.includes(item.permission)).map(item => {
          const isActive = item.key === current

          return (
            <li key={item.key}>
              <Link
                href={item.href(zone)}
                className='fr-btn fr-btn--tertiary-no-outline'
                aria-current={isActive ? 'page' : undefined}
                style={{
                  boxShadow: isActive
                    ? 'inset 0 -3px 0 0 var(--border-active-blue-france)'
                    : undefined,
                  fontWeight: isActive ? 700 : undefined
                }}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  </Box>
)

export default ZoneSubNavigation
