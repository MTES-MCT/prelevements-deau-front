'use client'

import {headerFooterDisplayItem} from '@codegouvfr/react-dsfr/Display'
import {Footer as DSFRFooter} from '@codegouvfr/react-dsfr/Footer'
import {usePathname} from 'next/navigation'

import {STATS_FOOTER_ITEM} from '@/lib/public-routes.js'

const noFooterPages = new Set(['/points-prelevement'])

const FooterComponent = () => {
  const pathname = usePathname() // Récupère l'URL actuelle

  if (noFooterPages.has(pathname)) {
    return null
  }

  return (
    <DSFRFooter
      accessibility='non compliant'
      bottomItems={[STATS_FOOTER_ITEM, headerFooterDisplayItem]}
      contentDescription=''
    />
  )
}

export default FooterComponent
