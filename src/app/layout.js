import {MuiDsfrThemeProvider} from '@codegouvfr/react-dsfr/mui'
import {AppRouterCacheProvider} from '@mui/material-nextjs/v15-appRouter'
import Link from 'next/link'
import Script from 'next/script'

import AuthSessionGuard from '@/components/auth/auth-session-guard.js'
import ImpersonationBanner from '@/components/auth/impersonation-banner.js'
import CrispChat from '@/components/crisp-chat.js'
import EnvironmentBanner from '@/components/environment-banner.js'
import Footer from '@/components/footer.js'
import Header from '@/components/header.js'
import MatomoTracker from '@/components/matomo-tracker.js'
import NavigationProgressProvider from '@/components/providers/navigation-progress-provider.js'
import NextAuthSessionProvider from '@/components/providers/session-provider.js'
import WebVitalsReporter from '@/components/web-vitals-reporter.js'
import {AuthProvider} from '@/contexts/auth-context.js'
import {defaultColorScheme} from '@/dsfr-bootstrap/default-color-scheme.js'
import {StartDsfrOnHydration, DsfrProvider} from '@/dsfr-bootstrap/index.js'
import {getHtmlAttributes, DsfrHead} from '@/dsfr-bootstrap/server-only-index.js'
import {getServerAuthSession} from '@/server/auth.js'

import '@/app/globals.css'
import '@/app/dark-mode.css'

export const metadata = {
  title: {
    default: 'Partageons l’Eau',
    template: '%s | Partageons l’Eau'
  },
  description: 'Suivre les prélèvements d’eau'
}

const MATOMO_URL = process.env.NEXT_PUBLIC_MATOMO_URL
const MATOMO_SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID
const IS_MATOMO_ENABLED = Boolean(MATOMO_URL && MATOMO_SITE_ID)
const CRISP_DISABLED_VALUES = new Set(['1', 'true', 'yes', 'on'])
const IS_CRISP_DISABLED = CRISP_DISABLED_VALUES.has(
  process.env.NEXT_PUBLIC_CRISP_DISABLED?.trim().toLowerCase()
)

const RootLayout = async ({children}) => {
  const session = await getServerAuthSession()

  return (
    <html {...getHtmlAttributes({defaultColorScheme})} >
      <head>
        <StartDsfrOnHydration />
        <DsfrHead Link={Link}
          preloadFonts={[
            'Marianne-Regular',
            'Marianne-Bold'
          ]}
        />
        {IS_MATOMO_ENABLED && (
          <Script id='matomo-init' strategy='beforeInteractive'>
            {`
              var _paq = window._paq = window._paq || [];
              _paq.push(['enableLinkTracking']);
              _paq.push(['setTrackerUrl', '${MATOMO_URL}matomo.php']);
              _paq.push(['setSiteId', '${MATOMO_SITE_ID}']);
            `}
          </Script>
        )}
        {IS_MATOMO_ENABLED && (
          <Script src={`${MATOMO_URL}matomo.js`} strategy='lazyOnload' />
        )}
      </head>
      <body>
        <NavigationProgressProvider>
          <EnvironmentBanner />
          <NextAuthSessionProvider session={session}>
            <AuthProvider>
              <AppRouterCacheProvider>
                <DsfrProvider>
                  <MuiDsfrThemeProvider>
                    <AuthSessionGuard />
                    <ImpersonationBanner />
                    <Header />
                    <MatomoTracker enabled={IS_MATOMO_ENABLED} />
                    <WebVitalsReporter enabled={IS_MATOMO_ENABLED} />
                    <CrispChat disabled={IS_CRISP_DISABLED} />
                    <main role='main' id='content'>
                      {children}
                    </main>
                    <Footer />
                  </MuiDsfrThemeProvider>
                </DsfrProvider>
              </AppRouterCacheProvider>
            </AuthProvider>
          </NextAuthSessionProvider>
        </NavigationProgressProvider>
      </body>
    </html>
  )
}

export default RootLayout
