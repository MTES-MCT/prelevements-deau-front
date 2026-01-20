import {MuiDsfrThemeProvider} from '@codegouvfr/react-dsfr/mui'
import {AppRouterCacheProvider} from '@mui/material-nextjs/v13-appRouter'
import Link from 'next/link'

import Footer from '@/components/footer.js'
import Header from '@/components/header.js'
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
    </head>
    <body>
      <NextAuthSessionProvider>
        <AuthProvider>
          <AppRouterCacheProvider>
            <DsfrProvider>
              <MuiDsfrThemeProvider>
                <Header />
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
