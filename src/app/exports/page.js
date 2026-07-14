import Alert from '@codegouvfr/react-dsfr/Alert'
import Link from 'next/link'
import {redirect} from 'next/navigation'

import ExportForm from '@/components/export/export-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getDataExportOptionsAction,
  listDataExportsAction
} from '@/server/actions/exports.js'
import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {
  title: 'Exports'
}

export const dynamic = 'force-dynamic'

const NoExportAccess = () => (
  <section className='border border-gray-200 bg-white p-4 md:p-5'>
    <Alert
      severity='info'
      title='Export non disponible'
      description='Les exports de données sont réservés aux agents et aux administrateurs. Les déclarants et les collecteurs peuvent consulter leurs déclarations depuis leur espace.'
    />
  </section>
)

const Page = async () => {
  const userResult = await getCurrentUser()
  if (userResult.code === 401) {
    redirect('/login')
  }

  const role = userResult.success ? userResult.data?.role : null
  const canExport = ['ADMIN', 'INSTRUCTOR'].includes(role)
  const [optionsResult, exportsResult] = canExport
    ? await Promise.all([
      getDataExportOptionsAction(),
      listDataExportsAction()
    ])
    : [
      null,
      null
    ]

  return (
    <>
      <StartDsfrOnHydration />

      <main className='min-h-screen bg-[#f7f7fb] pb-12'>
        <div className='fr-container pt-8 md:pt-10'>
          <div className='mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
            <div>
              <h1 className='fr-h2 fr-mb-2w'>
                Exports
              </h1>

              <p className='fr-text--sm fr-mb-0 text-gray-700'>
                Téléchargez un fichier Excel contenant les index et volumes prélevés sur les points de prélèvement de votre territoire, pour la période de votre choix.
              </p>
            </div>

            {canExport && (
              <Link
                className='fr-link fr-icon-question-line fr-link--icon-left shrink-0'
                href='/exports/aide'
              >
                Lexique du fichier exporté
              </Link>
            )}
          </div>

          {canExport ? (
            <ExportForm
              options={optionsResult?.success ? optionsResult.data : {}}
              initialExports={exportsResult?.success ? exportsResult.data?.items ?? [] : []}
            />
          ) : (
            <NoExportAccess />
          )}
        </div>
      </main>
    </>
  )
}

export default Page
