import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography} from '@mui/material'
import {forbidden, notFound, redirect} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import PointEditionForm from '@/components/form/point-edition-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getPointPrelevementURL} from '@/lib/urls.js'
import {
  getPointPrelevementAction
} from '@/server/actions/points-prelevement.js'
import {getPointPrelevementLabel} from '@/utils/point-prelevement.js'

export async function generateMetadata({params}) {
  const {id} = await params
  const result = await getPointPrelevementAction(id)

  return buildPageTitle([
    'Éditer',
    result.success && result.data ? getPointPrelevementLabel({pointPrelevement: result.data}) : null
  ], 'Éditer un point de prélèvement')
}

const Page = async ({params, searchParams}) => {
  const {id} = await params
  const result = await getPointPrelevementAction(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const pointPrelevement = result.data

  if (!pointPrelevement.right?.canEdit) {
    forbidden()
  }

  if (pointPrelevement.id !== id) {
    redirect(getPointPrelevementURL(pointPrelevement, {edit: true, searchParams: await searchParams}))
  }

  return (
    <>
      <StartDsfrOnHydration />

      <div className='flex justify-between gap-4 items-center mb-4'>
        <Typography variant='h3'>
          Édition du point de prélèvement {pointPrelevement.name}
        </Typography>

        <Button
          priority='secondary'
          iconId='fr-icon-close-line'
          linkProps={{
            href: getPointPrelevementURL(pointPrelevement)
          }}
        >
          Annuler
        </Button>
      </div>

      <PointEditionForm
        canDelete={pointPrelevement.right.permissions?.includes('pp.delete')}
        pointPrelevement={pointPrelevement}
      />
    </>
  )
}

export default Page
