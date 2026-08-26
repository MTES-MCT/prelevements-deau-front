import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import moment from 'moment'

import MyDeclarationsList from '@/components/declarations/my-declarations-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getMyDeclarationFeedAction
} from '@/server/actions/declarations.js'
import 'moment/locale/fr'

moment.locale('fr')

export const metadata = {
  title: 'Mes déclarations'
}

export const dynamic = 'force-dynamic'

const DECLARATION_CREATION_INTRO = 'Saisissez vos index, volumes prélevés ou volumes rejetés directement sur la plateforme, ou déposez un fichier.'
const INITIAL_FEED_LIMIT = 20

const Dossiers = async () => {
  const result = await getMyDeclarationFeedAction({limit: INITIAL_FEED_LIMIT})
  const response = result?.success && result.data?.success ? result.data : null
  const entries = response?.data ?? []
  const meta = response?.meta ?? {}
  const allowedDeclarationTypes = meta.allowedDeclarationTypes ?? []
  const canCreateDeclaration = meta.canCreateDeclaration ?? allowedDeclarationTypes.length > 0
  const canCreateQuickDeclaration = meta.canCreateQuickDeclaration ?? false
  const canCreateAnyDeclaration = canCreateDeclaration || canCreateQuickDeclaration
  let declarationsContent

  if (!response) {
    declarationsContent = (
      <div className='flex flex-col gap-3'>
        <Alert
          severity='error'
          title='Déclarations indisponibles'
          description='Le chargement de vos déclarations a échoué. Vous pouvez réessayer sans perdre de données.'
        />
        <div>
          <Button
            priority='secondary'
            iconId='fr-icon-refresh-line'
            linkProps={{href: '/mes-declarations'}}
          >
            Réessayer
          </Button>
        </div>
      </div>
    )
  } else if (meta.total === 0) {
    declarationsContent = (
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
    )
  } else {
    declarationsContent = (
      <MyDeclarationsList
        initialEntries={entries}
        initialMeta={meta}
        showDeclarant={meta.declarantRole === 'COLLECTEUR'}
      />
    )
  }

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
                  Nouvelle déclaration
                </h2>

                <p className='fr-text--sm fr-mb-0 text-gray-700'>
                  {DECLARATION_CREATION_INTRO}
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
          {declarationsContent}
        </section>
      </div>
    </main>
  )
}

export default Dossiers
