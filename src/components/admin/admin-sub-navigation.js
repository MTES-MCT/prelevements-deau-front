'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'

import {useAuthMethods} from '@/contexts/auth-methods-context.js'
import {getActiveAdminNavigationItem, getVisibleAdminNavigationItems} from '@/lib/admin-navigation.js'

const AdminSubNavigation = () => {
  const pathname = usePathname()
  const activeItem = getActiveAdminNavigationItem(pathname)
  const {available, methods} = useAuthMethods()
  const visibleItems = getVisibleAdminNavigationItems({
    available,
    authMethods: methods
  })

  return (
    <nav aria-label='Navigation de l’administration' className='mb-6 border-b border-gray-300'>
      <ul className='m-0 flex list-none flex-wrap gap-x-1 gap-y-0 p-0'>
        {visibleItems.map(item => {
          const active = item.key === activeItem?.key

          return (
            <li key={item.key}>
              <Link
                aria-current={active ? 'page' : undefined}
                className={`fr-btn fr-btn--tertiary-no-outline fr-btn--sm relative gap-2 whitespace-nowrap ${active ? 'font-semibold' : ''}`}
                href={item.href}
                style={{
                  boxShadow: active
                    ? 'inset 0 -3px 0 0 var(--border-active-blue-france)'
                    : undefined
                }}
              >
                <span className={item.iconClassName} aria-hidden='true' />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default AdminSubNavigation
