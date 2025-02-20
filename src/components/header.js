'use client'

import {headerFooterDisplayItem} from '@codegouvfr/react-dsfr/Display'
import {Header as DSFRHeader} from '@codegouvfr/react-dsfr/Header'
import {usePathname} from 'next/navigation'

import LoginHeaderItem from '@/components/ui/login-header-item.js'

const navigationItems = [
  {
    menuLinks: [
      {
        linkProps: {
          href: '/'
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
    text: 'Démarches simplifiées'
  },
  {
    linkProps: {
      href: '/prelevements-deau',
      target: '_self'
    },
    text: 'Prélèvements d’eau'
  },
  {
    linkProps: {
      href: '/preleveurs',
      target: '_self'
    },
    text: 'Préleveurs'
  },
  {
    linkProps: {
      href: '/points-prelevement',
      target: '_self'
    },
    text: 'Points de prélèvement'
  }
]

const HeaderComponent = ({user}) => {
  const pathname = usePathname()

  const isActive = href => {
    if (href === '/') {
      return pathname === href || pathname === '/validateur'
    }

    return pathname.startsWith(href) // Correspondance partielle pour les autres chemins
  }

  return (
    <DSFRHeader
      brandTop={<>Préfet<br />de la Réunion</>}
      serviceTitle='Suivi des prélèvements d’eau'
      homeLinkProps={{
        href: '/',
        title: 'Accueil - Suivi des prélèvements d’eau'
      }}
      quickAccessItems={[
        headerFooterDisplayItem,
        user ? <LoginHeaderItem key={0} /> : null
      ]}
      navigation={
        navigationItems.map(item => ({
          ...item,
          isActive: isActive(item.linkProps?.href || item.menuLinks[0].linkProps.href)
        }))
      }
    />
  )
}

export default HeaderComponent
