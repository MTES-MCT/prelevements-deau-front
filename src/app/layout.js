import {MuiDsfrThemeProvider} from '@codegouvfr/react-dsfr/mui'
import {AppRouterCacheProvider} from '@mui/material-nextjs/v13-appRouter'
import Link from 'next/link'
import Script from 'next/script'

import Footer from '@/components/footer.js'
import Header from '@/components/header.js'
import MatomoTracker from '@/components/matomo-tracker.js'
import NextAuthSessionProvider from '@/components/providers/session-provider.js'
import {AuthProvider} from '@/contexts/auth-context.js'
import {defaultColorScheme} from '@/dsfr-bootstrap/default-color-scheme.js'
import {StartDsfrOnHydration, DsfrProvider} from '@/dsfr-bootstrap/index.js'
import {getHtmlAttributes, DsfrHead} from '@/dsfr-bootstrap/server-only-index.js'

import '@codegouvfr/react-dsfr/dsfr/utility/icons/icons.min.css'
import '@/app/globals.css'

export const metadata = {
  title: 'Partageons l’Eau',
  description: 'Suivre les prélèvements d’eau'
}

const MATOMO_URL = process.env.NEXT_PUBLIC_MATOMO_URL
const MATOMO_SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID

const RootLayout = ({children}) => (
  <html {...getHtmlAttributes({defaultColorScheme})} >
    <head>
      <StartDsfrOnHydration />
      <DsfrHead Link={Link}
        preloadFonts={[
          'Marianne-Regular',
          'Marianne-Medium',
          'Marianne-Bold'
        ]}
      />
      {MATOMO_URL && MATOMO_SITE_ID && (
        <Script id='matomo-init' strategy='afterInteractive'>
          {`
            var _paq = window._paq = window._paq || [];
            _paq.push(['enableLinkTracking']);
            (function() {
              var u="${MATOMO_URL}";
              _paq.push(['setTrackerUrl', u+'matomo.php']);
              _paq.push(['setSiteId', '${MATOMO_SITE_ID}']);
              var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
              g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
            })();
          `}
        </Script>
      )}
    </head>
    <body>
      <NextAuthSessionProvider>
        <AuthProvider>
          <AppRouterCacheProvider>
            <DsfrProvider>
              <MuiDsfrThemeProvider>
                <Header />
                <MatomoTracker />
                <main role='main' id='content'>
                  {children}
                </main>
                <Footer />
              </MuiDsfrThemeProvider>
            </DsfrProvider>
          </AppRouterCacheProvider>
        </AuthProvider>
      </NextAuthSessionProvider>
    </body>
  </html>
)

export default RootLayout
