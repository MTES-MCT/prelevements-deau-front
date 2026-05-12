import {Button} from '@codegouvfr/react-dsfr/Button'

import PointCreationForm from '@/components/form/point-creation-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Page = () => (
  <>
    <StartDsfrOnHydration />

    <div className='fr-container mt-4 mb-4 flex justify-end'>
      <Button
        priority='secondary'
        iconId='fr-icon-close-line'
        linkProps={{
          href: '/points-prelevement'
        }}
      >
        Annuler
      </Button>
    </div>

    <PointCreationForm />
  </>
)

export default Page
