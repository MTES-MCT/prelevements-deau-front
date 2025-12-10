'use client'

import {useCallback, useMemo} from 'react'

import {Header as DSFRHeader} from '@codegouvfr/react-dsfr/Header'
import {Chip} from '@mui/material'
import {usePathname, useRouter} from 'next/navigation'

import {useAuth} from '@/contexts/auth-context.js'

const ROLE_LABELS = {
  editor: 'Administrateur',
  reader: 'Inspecteur'
}

const ROLE_COLORS = {
  editor: 'var(--artwork-decorative-blue-france)',
  reader: 'var(--artwork-decorative-purple-glycine)'
}

const defaultNavigation = [
  {
    linkProps: {
      href: '/',
      target: '_self'
    },
    text: 'Accueil'
  },
  {
    linkProps: {
      href: '/validateur',
      target: '_self'
    },
    text: 'Validateur'
  }
]

const adminNavigation = [
  {
    linkProps: {
      href: '/',
      target: '_self'
    },
    text: 'Accueil'
  },
  {
    linkProps: {
      href: '/points-prelevement',
      target: '_self'
    },
    text: 'Points de prélèvement'
  },
  {
    linkProps: {
      href: '/preleveurs',
      target: '_self'
    },
    text: 'Préleveurs'
  },
  {
    menuLinks: [
      {
        linkProps: {
          href: '/dossiers'
        },
        text: 'Dossiers déposés'
      },
      {
        linkProps: {
          href: '/validateur'
        },
        text: 'Validateur de fichier'
      }
    ],
    text: 'Déclarations'
  },
  {
    linkProps: {
      href: '/statistiques',
      target: '_self'
    },
    text: 'Statistiques'
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

      if (href === '/dossiers') {
        return pathname === '/dossiers' || pathname === '/validateur'
      }

      return pathname.startsWith(href) // Correspondance partielle pour les autres chemins
    }

    const navigation = user ? adminNavigation : defaultNavigation
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

    // Territory information (non-interactive element)
    if (user.territoire?.nom) {
      items.push(
        <span key='territoire' className='fr-btn fr-icon-map-pin-2-line' style={{cursor: 'default', pointerEvents: 'none'}}>
          {user.territoire.nom}
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
