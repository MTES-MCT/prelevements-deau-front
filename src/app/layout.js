import MuiDsfrThemeProvider from '@codegouvfr/react-dsfr/mui'
import {DsfrHead} from '@codegouvfr/react-dsfr/next-appdir/DsfrHead'
import {DsfrProvider} from '@codegouvfr/react-dsfr/next-appdir/DsfrProvider'
import {getHtmlAttributes} from '@codegouvfr/react-dsfr/next-appdir/getHtmlAttributes'
import {AppRouterCacheProvider} from '@mui/material-nextjs/v13-appRouter'
import Link from 'next/link'
import {getServerSession} from 'next-auth'

import {defaultColorScheme} from '@/app/default-color-scheme.js'
import {StartDsfr} from '@/app/start-dsfr.js'
import Footer from '@/components/footer.js'
import Header from '@/components/header.js'

import '@codegouvfr/react-dsfr/dsfr/utility/icons/icons.min.css'
import '@/app/globals.css'

export const metadata = {
  title: 'Prélèvement d’eau',
  description: 'Suivre les prélèvements d’eau'
}

const RootLayout = async ({children}) => {
  const session = await getServerSession()

  return (
    <html {...getHtmlAttributes({defaultColorScheme})} >
      <head>
        <StartDsfr />
        <DsfrHead Link={Link}
          preloadFonts={[
            // "Marianne-Light",
            // "Marianne-Light_Italic",
            'Marianne-Regular',
            // "Marianne-Regular_Italic",
            'Marianne-Medium',
            // "Marianne-Medium_Italic",
            'Marianne-Bold'
            // "Marianne-Bold_Italic",
            // "Spectral-Regular",
            // "Spectral-ExtraBold"
          ]}
        />
      </head>
      <body>
        <AppRouterCacheProvider>
          <DsfrProvider>
            <MuiDsfrThemeProvider>
              <Header user={session?.user} />
              <main role='main' id='content'>
                {children}
              </main>
              <Footer />
            </MuiDsfrThemeProvider>
          </DsfrProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}

export default RootLayout
