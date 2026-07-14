import {Button} from '@codegouvfr/react-dsfr/Button'
import {forbidden} from 'next/navigation'

import PointCreationForm from '@/components/form/point-creation-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {
  title: 'Nouveau point de prélèvement'
}

const Page = async () => {
  const currentUserResult = await getCurrentUser()
  if (!currentUserResult?.data?.permissions?.includes('pp.create')) {
    forbidden()
  }

  return (
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
}

export default Page
