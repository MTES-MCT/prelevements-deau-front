'use client'

import {useCallback, useMemo} from 'react'

import {Header as DSFRHeader} from '@codegouvfr/react-dsfr/Header'
import {Chip} from '@mui/material'
import {usePathname, useRouter} from 'next/navigation'

import {useAuth} from '@/contexts/auth-context.js'

const ROLE_LABELS = {
  DECLARANT: 'Déclarant',
  INSTRUCTOR: 'Instructeur',
  ADMIN: 'Administrateur'
}

const ROLE_COLORS = {
  DECLARANT: 'var(--artwork-decorative-blue-france)',
  INSTRUCTOR: 'var(--artwork-decorative-purple-glycine)',
  ADMIN: 'var(--artwork-decorative-purple-glycine)'
}

const NAV_ITEMS = [
  {
    linkProps: {
      href: '/',
      target: '_self'
    },
    text: 'Accueil'
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
      href: '/declarations',
      target: '_self'
    },
    text: 'Déclarations',
    roles: ['INSTRUCTOR', 'ADMIN']
  },
  {
    linkProps: {
      href: '/points-prelevement',
      target: '_self'
    },
    text: 'Points de prélèvement',
    roles: ['INSTRUCTOR', 'ADMIN']
  },
  {
    linkProps: {
      href: '/preleveurs',
      target: '_self'
    },
    text: 'Préleveurs',
    roles: ['INSTRUCTOR', 'ADMIN']
  }
]

const HeaderComponent = () => {
  const {user, logout, isLoading: isLoadingUser} = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = useCallback(async () => {
    await logout()
    router.push('/login')
  }, [logout, router])

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
      if (!item.roles) {
        return true
      }

      return item.roles.includes(user?.role)
    })

    return navigation.map(item => ({
      ...item,
      isActive: isActive(item.linkProps?.href || item.menuLinks?.[0].linkProps.href)
    }))
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

    // User name with role badge (non-interactive element)
    const userName = `${user.prenom || ''} ${user.nom || ''}`.trim()
    const roleLabel = user.role ? ROLE_LABELS[user.role] : null
    const roleColor = user.role ? ROLE_COLORS[user.role] : null

    if (userName) {
      items.push(
        <span key='user' className='fr-btn ri-account-circle-fill flex items-center gap-2' style={{cursor: 'default', pointerEvents: 'none'}}>
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

    // Logout button
    items.push({
      iconId: 'ri-logout-box-r-line',
      text: 'Se déconnecter',
      buttonProps: {
        onClick: handleLogout
      }
    })

    return items
  }, [user, isLoadingUser, handleLogout])

  return (
    <DSFRHeader
      brandTop={<>Préfet<br />de la Réunion</>}
      serviceTitle='Suivi des prélèvements d’eau'
      homeLinkProps={{
        href: '/',
        // eslint-disable-next-line quotes
        title: "Accueil - Suivi des prélèvements d’eau"
      }}
      quickAccessItems={quickAccessItems}
      navigation={navigation}
    />
  )
}

export default HeaderComponent
