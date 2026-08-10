'use client'

import {useCallback, useMemo} from 'react'

import {Header as DSFRHeader} from '@codegouvfr/react-dsfr/Header'
import {Chip} from '@mui/material'
import {usePathname} from 'next/navigation'

import HeaderDropdownMenu from '@/components/admin/header-dropdown-menu.js'
import {useAuth} from '@/contexts/auth-context.js'

const ROLE_LABELS = {
  DECLARANT: 'Déclarant',
  INSTRUCTOR: 'Agent',
  ADMIN: 'Administrateur'
}

const DECLARANT_ROLE_LABELS = {
  PRELEVEUR: 'Préleveur',
  COLLECTEUR: 'Collecteur'
}

const ROLE_COLORS = {
  DECLARANT: 'var(--artwork-decorative-blue-france)',
  INSTRUCTOR: 'var(--artwork-decorative-purple-glycine)',
  ADMIN: 'var(--artwork-decorative-purple-glycine)'
}

const NAV_ITEMS = [
  {
    linkProps: {
      href: '/tableau-de-bord',
      target: '_self'
    },
    text: 'Tableau de bord',
    roles: ['DECLARANT', 'INSTRUCTOR', 'ADMIN'],
    permission: 'zone.dashboard.read'
  },
  {
    linkProps: {
      href: '/mes-declarations',
      target: '_self'
    },
    text: 'Mes déclarations',
    roles: ['DECLARANT']
  },
  {
    linkProps: {
      href: '/preleveurs',
      target: '_self'
    },
    text: 'Préleveurs',
    roles: ['DECLARANT'],
    declarantRoles: ['COLLECTEUR']
  },
  {
    linkProps: {
      href: '/declarations',
      target: '_self'
    },
    text: 'Déclarations',
    roles: ['INSTRUCTOR', 'ADMIN'],
    permission: 'declaration.list'
  },
  {
    linkProps: {
      href: '/points-prelevement',
      target: '_self'
    },
    text: 'Points de prélèvements',
    roles: ['DECLARANT', 'INSTRUCTOR', 'ADMIN'],
    permission: 'pp.map.read'
  },
  {
    linkProps: {
      href: '/declarants',
      target: '_self'
    },
    text: 'Déclarants',
    roles: ['INSTRUCTOR', 'ADMIN'],
    permission: 'declarant.list'
  },
  {
    linkProps: {
      href: '/zones',
      target: '_self'
    },
    text: 'Mes zones',
    roles: ['INSTRUCTOR', 'ADMIN'],
    permission: 'zone.detail.read'
  },
  {
    linkProps: {
      href: '/exports',
      target: '_self'
    },
    text: 'Exports',
    roles: ['INSTRUCTOR', 'ADMIN'],
    permission: 'export.volumes'
  }
]

function getNavigationText(item, href, role) {
  if (href === '/zones' && role === 'ADMIN') {
    return 'Zones'
  }

  if (href === '/points-prelevement' && role === 'ADMIN') {
    return 'Points de prélèvements'
  }

  return item.text
}

const HeaderComponent = () => {
  const {user, logout, isLoading: isLoadingUser} = useAuth()
  const pathname = usePathname()

  const handleLogout = useCallback(async () => {
    await logout()
  }, [logout])

  const navigation = useMemo(() => {
    if (isLoadingUser) {
      return null
    }

    const isActive = href => {
      if (href === '/') {
        return pathname === '/'
      }

      return pathname.startsWith(href)
    }

    const navigation = NAV_ITEMS.filter(item => {
      if (item.roles && !item.roles.includes(user?.role)) {
        return false
      }

      if (item.declarantRoles && !item.declarantRoles.includes(user?.declarantRole)) {
        return false
      }

      if (item.permission && user?.role !== 'DECLARANT' && !user?.permissions?.includes(item.permission)) {
        return false
      }

      return true
    })

    return navigation.map(item => {
      const href = item.linkProps?.href || item.menuLinks?.[0].linkProps.href

      return {
        ...item,
        text: getNavigationText(item, href, user?.role),
        isActive: isActive(href)
      }
    })
  }, [user, isLoadingUser, pathname])

  const quickAccessItems = useMemo(() => {
    if (isLoadingUser) {
      return []
    }

    if (!user) {
      return [
        {
          iconId: 'ri-account-circle-line',
          text: 'Se connecter',
          linkProps: {
            href: '/login'
          }
        }
      ]
    }

    const items = []
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.socialReason
    const roleLabel = user.declarantRole
      ? DECLARANT_ROLE_LABELS[user.declarantRole]
      : (user.role ? ROLE_LABELS[user.role] : null)
    const roleColor = user.role ? ROLE_COLORS[user.role] : null

    if (userName) {
      items.push(
        <span key='user' className='fr-btn flex items-center gap-2' style={{cursor: 'default', pointerEvents: 'none'}}>
          {userName}
          {roleLabel && (
            <Chip
              label={roleLabel}
              size='small'
              sx={{
                backgroundColor: roleColor,
                color: 'var(--text-default-grey)',
                height: '20px',
                fontSize: '0.75rem'
              }}
            />
          )}
        </span>
      )
    }

    if (user.role === 'ADMIN' && !user.impersonation?.active) {
      items.push({
        iconId: 'ri-admin-line',
        text: 'Administration',
        linkProps: {
          href: '/administration'
        }
      })
    }

    items.push(
      <HeaderDropdownMenu
        key='account'
        active={pathname.startsWith('/mon-compte')}
        iconClassName='ri-account-circle-fill'
        items={[
          {
            key: 'account',
            label: 'Mon compte',
            href: '/mon-compte',
            iconClassName: 'ri-account-circle-line',
            active: pathname.startsWith('/mon-compte')
          },
          {
            key: 'logout',
            label: 'Se déconnecter',
            iconClassName: 'ri-logout-box-r-line',
            onSelect: handleLogout
          }
        ]}
        label='Mon compte'
      />
    )

    return items
  }, [user, isLoadingUser, handleLogout, pathname])

  return (
    <DSFRHeader
      brandTop={<>
        Ministères
        <br />
        transition écologique
        <br />
        aménagement du territoire
        <br />
        transports
        <br />
        ville et logement
      </>}
      serviceTitle='Partageons l’eau'
      homeLinkProps={{
        href: '/',
        // eslint-disable-next-line quotes
        title: "Accueil - Partageons l’Eau"
      }}
      quickAccessItems={quickAccessItems}
      navigation={navigation}
    />
  )
}

export default HeaderComponent
