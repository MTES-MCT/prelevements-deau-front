import {Button} from '@codegouvfr/react-dsfr/Button'
import moment from 'moment'

import MyDeclarationsList from '@/components/declarations/my-declarations-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getMyDeclarationsAction,
  getMyTelemetrySourcesAction
} from '@/server/actions/declarations.js'
import 'moment/locale/fr'

moment.locale('fr')

export const metadata = {
  title: 'Mes déclarations'
}

export const dynamic = 'force-dynamic'

const Dossiers = async () => {
  const [result, telemetrySourcesResult] = await Promise.all([
    getMyDeclarationsAction(),
    getMyTelemetrySourcesAction()
  ])
  const response = result?.success ? result.data : null
  const dossiers = response?.data ?? []
  const telemetrySources = telemetrySourcesResult?.success ? telemetrySourcesResult.data?.data ?? [] : []
  const meta = response?.meta ?? {}
  const allowedDeclarationTypes = meta.allowedDeclarationTypes ?? []
  const canCreateDeclaration = meta.canCreateDeclaration ?? allowedDeclarationTypes.length > 0
  const canCreateQuickDeclaration = meta.canCreateQuickDeclaration ?? false
  const canCreateAnyDeclaration = canCreateDeclaration || canCreateQuickDeclaration
  const allowedDeclarationTypesLabel = allowedDeclarationTypes
    .map(declarationType => declarationType.name)
    .join(', ')
  const declarationIntro = (() => {
    if (canCreateQuickDeclaration && canCreateDeclaration) {
      return 'Saisissez vos index, volumes prélevés ou volumes rejetés directement sur la plateforme, ou déposez un fichier après contrôle automatique.'
    }

    if (canCreateQuickDeclaration) {
      return 'Saisissez vos index, volumes prélevés ou volumes rejetés directement sur la plateforme.'
    }

    return 'Déposez vos fichiers de déclaration après contrôle automatique.'
  })()

  return (
    <main className='min-h-screen bg-[#f7f7fb] pb-12'>
      <StartDsfrOnHydration />

      <div className='fr-container pt-6 md:pt-8'>
        <div className='mb-4'>
          <h1 className='fr-h3 fr-mb-1v'>
            Mes déclarations
          </h1>

          <p className='fr-text--sm fr-mb-0 text-gray-700'>
            Retrouvez toutes les déclarations de prélèvements d’eau visibles depuis votre compte.
          </p>
        </div>

        {canCreateAnyDeclaration && (
          <section className='mb-5 border border-gray-200 bg-white px-4 py-4 md:px-5'>
            <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
              <div>
                <h2 className='fr-mb-1v text-lg font-bold leading-snug text-gray-900 md:text-xl'>
                  Déclarez vos prélèvements d’eau
                </h2>

                <p className='fr-text--sm fr-mb-0 max-w-[760px] text-gray-700'>
                  {declarationIntro}
                  {meta.declarantRole === 'COLLECTEUR'
                    ? <> Vous sélectionnerez ensuite le déclarant concerné.</>
                    : null}
                  {allowedDeclarationTypesLabel ? (
                    <> Types autorisés : {allowedDeclarationTypesLabel}.</>
                  ) : null}
                </p>
              </div>

              <Button
                priority='primary'
                iconId='fr-icon-add-line'
                iconPosition='left'
                linkProps={{
                  href: '/mes-declarations/new'
                }}
                title='Créer une nouvelle déclaration'
              >
                Nouvelle déclaration
              </Button>
            </div>
          </section>
        ) }

        <section>
          {dossiers.length === 0 && telemetrySources.length === 0 ? (
            <div className='border border-gray-200 bg-white p-5 md:p-6'>
              <div className='flex max-w-2xl flex-col gap-2'>
                <span
                  className='fr-icon-file-text-line text-[#000091] [&::after]:![--icon-size:1.25rem] [&::before]:![--icon-size:1.25rem]'
                  aria-hidden='true'
                />
                <h2 className='fr-h4 fr-mb-0'>
                  Aucune déclaration
                </h2>
                <p className='fr-text--sm fr-mb-0 text-gray-700'>
                  Vous n’avez pas encore déposé de déclaration de prélèvements d’eau.
                </p>
              </div>
            </div>
          ) : (
            <MyDeclarationsList
              declarations={dossiers}
              showDeclarant={meta.declarantRole === 'COLLECTEUR'}
              telemetrySources={telemetrySources}
            />
          )}
        </section>
      </div>
    </main>
  )
}

export default Dossiers
