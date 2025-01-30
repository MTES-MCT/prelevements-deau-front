'use client'

import {Footer as DSFRFooter} from '@codegouvfr/react-dsfr/Footer'
import {usePathname} from 'next/navigation'

const noFooterPages = new Set(['/points-prelevement'])

const FooterComponent = () => {
  const pathname = usePathname() // Récupère l'URL actuelle

  if (noFooterPages.has(pathname)) {
    return null
  }

  return (
    <DSFRFooter
      accessibility='fully compliant'
      contentDescription=''
    />
  )
}

export default FooterComponent
