'use client'

import {useEffect, useMemo, useState} from 'react'

import {headerFooterDisplayItem} from '@codegouvfr/react-dsfr/Display'
import {Header as DSFRHeader} from '@codegouvfr/react-dsfr/Header'
import {usePathname} from 'next/navigation'
import {getSession} from 'next-auth/react'

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
      href: '/prelevements',
      target: '_self'
    },
    text: 'Prélèvements'
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
  const [user, setUser] = useState(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  const pathname = usePathname()

  useEffect(() => {
    const fetchUser = async () => {
      const session = await getSession()
      setUser(session?.user)
      setIsLoadingUser(false)
    }

    fetchUser()
  }, [])

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
        headerFooterDisplayItem,
        <LoginHeaderItem key='login' user={user} />
      ]}
      navigation={navigation}
    />
  )
}

export default HeaderComponent
