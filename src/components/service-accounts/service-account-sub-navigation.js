'use client'

import Link from 'next/link'

const ITEMS = [
  {
    key: 'overview',
    label: 'Vue d’ensemble',
    href: serviceAccount => `/comptes-service/${serviceAccount.id}`
  },
  {
    key: 'credentials',
    label: 'Identifiants techniques',
    href: serviceAccount => `/comptes-service/${serviceAccount.id}/identifiants`
  }
]

const ServiceAccountSubNavigation = ({serviceAccount, current}) => (
  <div
    className='fr-mb-2w'
    style={{
      borderBottom: '1px solid var(--border-default-grey)'
    }}
  >
    <nav aria-label='Navigation du compte de service'>
      <ul className='flex gap-1 flex-wrap fr-mb-0 p-0 list-none'>
        {ITEMS.map(item => {
          const isActive = item.key === current

          return (
            <li key={item.key}>
              <Link
                href={item.href(serviceAccount)}
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
  </div>
)

export default ServiceAccountSubNavigation
