'use client'

import {Box} from '@mui/material'
import Link from 'next/link'

const ITEMS = [
  {
    key: 'overview',
    label: 'Vue d’ensemble',
    href: zone => `/zones/${zone.id}`
  },
  {
    key: 'points',
    label: 'Points de prélèvement',
    href: zone => `/zones/${zone.id}/points-prelevement`
  },
  {
    key: 'declarants',
    label: 'Déclarants',
    href: zone => `/zones/${zone.id}/declarants`
  },
  {
    key: 'collecteurs',
    label: 'Collecteurs',
    href: zone => `/zones/${zone.id}/collecteurs`
  },
  {
    key: 'exploitations',
    label: 'Exploitations',
    href: zone => `/zones/${zone.id}/exploitations`
  },
  {
    key: 'agents',
    label: 'Agents',
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
        {ITEMS.map(item => {
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
