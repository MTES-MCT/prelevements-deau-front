'use client'

import {headerFooterDisplayItem} from '@codegouvfr/react-dsfr/Display'
import {Footer as DSFRFooter} from '@codegouvfr/react-dsfr/Footer'
import {usePathname} from 'next/navigation'

const noFooterPages = new Set(['/prelevements'])

const FooterComponent = () => {
  const pathname = usePathname() // Récupère l'URL actuelle

  if (noFooterPages.has(pathname)) {
    return null
  }

  return (
    <DSFRFooter
      bottomItems={[headerFooterDisplayItem]}
      accessibility='fully compliant'
      contentDescription=''
    />
  )
}

export default FooterComponent
