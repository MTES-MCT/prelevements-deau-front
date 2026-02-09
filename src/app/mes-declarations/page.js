import {fr} from '@codegouvfr/react-dsfr'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {CallOut} from '@codegouvfr/react-dsfr/CallOut'
import moment from 'moment'

import DossierCard from '@/components/declarations/dossier/dossier-card.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarationURL} from '@/lib/urls.js'
import {getMyDeclarationsAction} from '@/server/actions/declarations.js'
import 'moment/locale/fr'

moment.locale('fr')

export const dynamic = 'force-dynamic'

const Dossiers = async () => {
  const result = await getMyDeclarationsAction()
  const dossiers = result?.success ? result.data.data : []

  return (
    <>
      <StartDsfrOnHydration />

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
            Déposez vos fichiers de déclaration après validation automatique.
          </p>

          <Button
            size='large'
            priority='primary'
            iconId='fr-icon-add-line'
            iconPosition='left'
            linkProps={{
              href: '/mes-declarations/new'
            }}
            title='Déposer une nouvelle déclaration'
          >
            Déposer une nouvelle déclaration
          </Button>
        </div>
      </div>

      <div className='fr-container fr-mt-6w fr-mb-6w'>
        <h2 className='fr-h4 fr-mb-1w'>
          Mes déclarations
        </h2>

        <p className='fr-text--sm fr-mb-4w'>
          Retrouvez toutes vos déclarations de prélèvements d’eau.
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
            { dossiers.map(((d, idx) => (
              <DossierCard
                key={d.id}
                background={idx % 2 === 0 ? 'primary' : 'secondary'}
                className='fr-mb-2w'
                dossier={d}
                url={getDeclarationURL(d)}
              />
            ))) }
          </div>
        )}
      </div>
    </>
  )
}

export default Dossiers
