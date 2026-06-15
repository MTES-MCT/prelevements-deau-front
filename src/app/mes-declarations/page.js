import {fr} from '@codegouvfr/react-dsfr'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {CallOut} from '@codegouvfr/react-dsfr/CallOut'
import moment from 'moment'

import DossierCard from '@/components/declarations/dossier/dossier-card.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getMyDeclarationURL} from '@/lib/urls.js'
import {getMyDeclarationsAction} from '@/server/actions/declarations.js'
import 'moment/locale/fr'

moment.locale('fr')

export const dynamic = 'force-dynamic'

const Dossiers = async () => {
  const result = await getMyDeclarationsAction()
  const response = result?.success ? result.data : null
  const dossiers = response?.data ?? []
  const meta = response?.meta ?? {}
  const allowedDeclarationTypes = meta.allowedDeclarationTypes ?? []
  const canCreateDeclaration = meta.canCreateDeclaration ?? allowedDeclarationTypes.length > 0
  const canCreateQuickDeclaration = meta.canCreateQuickDeclaration ?? false
  const allowedDeclarationTypesLabel = allowedDeclarationTypes
    .map(declarationType => declarationType.name)
    .join(', ')

  return (
    <>
      <StartDsfrOnHydration />

      {canCreateDeclaration && (
        <div
          className='fr-mt-4w fr-mb-4w'
          style={{
            backgroundColor: fr.colors.decisions.background.alt.blueFrance.default
          }}
        >
          <div className='fr-container fr-py-6w text-center'>
            <h2 className='fr-h3 fr-mb-2w'>
              Déclarez vos prélèvements d’eau
            </h2>

            <p className='fr-text fr-mb-3w'>
              {canCreateQuickDeclaration
                ? 'Saisissez vos index directement sur la plateforme ou déposez un fichier après validation automatique.'
                : 'Déposez vos fichiers de déclaration après validation automatique.'}
              {meta.declarantRole === 'COLLECTEUR'
                ? <> Vous sélectionnerez ensuite le préleveur concerné.</>
                : null}
              {allowedDeclarationTypesLabel ? (
                <> Types autorisés : {allowedDeclarationTypesLabel}.</>
              ) : null}
            </p>

            <Button
              size='large'
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
        </div>
      ) }

      <div className='fr-container fr-mt-6w fr-mb-6w'>
        <h2 className='fr-h4 fr-mb-1w'>
          Mes déclarations
        </h2>

        <p className='fr-text--sm fr-mb-4w'>
          Retrouvez toutes les déclarations de prélèvements d’eau visibles depuis votre compte.
        </p>

        {dossiers.length === 0 ? (
          <CallOut
            iconId='ri-information-line'
            title='Aucune déclaration'
          >
            Vous n’avez pas encore déposé de déclaration de prélèvements d’eau.
          </CallOut>
        ) : (
          <div>
            {dossiers
              .map((dossier, idx) => (
                <DossierCard
                  key={dossier.id}
                  background={idx % 2 === 0 ? 'primary' : 'secondary'}
                  className='fr-mb-2w'
                  dossier={dossier}
                  url={getMyDeclarationURL(dossier)}
                />
              ))}
          </div>
        )}
      </div>
    </>
  )
}

export default Dossiers
