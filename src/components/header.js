'use client'

import {useMemo} from 'react'

import {Header as DSFRHeader} from '@codegouvfr/react-dsfr/Header'
import {usePathname} from 'next/navigation'
import {useSession} from 'next-auth/react'

import LoginHeaderItem from '@/components/ui/login-header-item.js'

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
    text: 'Points de prélevement'
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
  const {data: session, status} = useSession()
  const user = session?.user
  const isLoadingUser = status === 'loading'

  const pathname = usePathname()

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

  return (
    <DSFRHeader
      brandTop={<>Préfet<br />de la Réunion</>}
      serviceTitle='Suivi des prélèvements d’eau'
      homeLinkProps={{
        href: '/',
        title: 'Accueil - Suivi des prélèvements d’eau'
      }}
      quickAccessItems={isLoadingUser ? [] : [
        <LoginHeaderItem key='login' user={user} />
      ]}
      navigation={navigation}
    />
  )
}

export default HeaderComponent
