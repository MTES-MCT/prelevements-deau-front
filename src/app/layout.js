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
import {AuthMethodsProvider} from '@/contexts/auth-methods-context.js'
import {defaultColorScheme} from '@/dsfr-bootstrap/default-color-scheme.js'
import {StartDsfrOnHydration, DsfrProvider} from '@/dsfr-bootstrap/index.js'
import {getHtmlAttributes, DsfrHead} from '@/dsfr-bootstrap/server-only-index.js'
import {
  isEnvironmentFlagEnabled,
  resolveMatomoConfig
} from '@/lib/integration-config.js'
import {PASSWORD_ACTIVATION_STORAGE_KEY} from '@/lib/password-activation.js'
import {getAuthConfigState} from '@/server/auth-config.js'
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

const {
  enabled: IS_MATOMO_ENABLED,
  siteId: MATOMO_SITE_ID,
  url: MATOMO_URL
} = resolveMatomoConfig({
  disabled: process.env.NEXT_PUBLIC_MATOMO_DISABLED,
  siteId: process.env.NEXT_PUBLIC_MATOMO_SITE_ID,
  url: process.env.NEXT_PUBLIC_MATOMO_URL
})
const IS_CRISP_DISABLED = isEnvironmentFlagEnabled(
  process.env.NEXT_PUBLIC_CRISP_DISABLED
)
const PASSWORD_ACTIVATION_FRAGMENT_SCRUB_SCRIPT = `
  (function () {
    if (window.location.pathname !== '/activation-mot-de-passe' || !window.location.hash) {
      return;
    }

    var parameters = new URLSearchParams(window.location.hash.slice(1));
    var value = parameters.get('token');

    try {
      if (value) {
        window.sessionStorage.setItem(${JSON.stringify(PASSWORD_ACTIVATION_STORAGE_KEY)}, value);
      }
    } catch (error) {
      // A storage refusal invalidates the link locally but must not expose it.
    }

    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search
    );
  })();
`

const RootLayout = async ({children}) => {
  const [session, authConfigState] = await Promise.all([
    getServerAuthSession(),
    getAuthConfigState()
  ])

  return (
    <html {...getHtmlAttributes({defaultColorScheme})} >
      <head>
        <Script id='password-activation-fragment-scrub' strategy='beforeInteractive'>
          {PASSWORD_ACTIVATION_FRAGMENT_SCRUB_SCRIPT}
        </Script>
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
            <AuthMethodsProvider
              available={authConfigState.available}
              methods={authConfigState.config.methods}
            >
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
            </AuthMethodsProvider>
          </NextAuthSessionProvider>
        </NavigationProgressProvider>
      </body>
    </html>
  )
}

export default RootLayout
