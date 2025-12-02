import dynamic from 'next/dynamic'
import {notFound} from 'next/navigation'

import {getPreleveur} from '@/app/api/points-prelevement.js'
import PreleveurDeleteSection from '@/components/form/preleveur-delete-section.js'
import PreleveurForm from '@/components/form/preleveur-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const DynamicBreadcrumb = dynamic(
  () => import('@codegouvfr/react-dsfr/Breadcrumb')
)

const Page = async ({params}) => {
  const {id} = await params
  const preleveur = await getPreleveur(id)

  if (!preleveur) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />

      <div className='fr-container'>
        <DynamicBreadcrumb
          currentPageLabel='Édition'
          homeLinkProps={{
            href: '/'
          }}
          segments={[
            {
              label: 'Préleveurs',
              linkProps: {
                href: '/preleveurs'
              }
            }
          ]}
        />
      </div>
      <PreleveurForm
        preleveur={preleveur}
      />
      <PreleveurDeleteSection
        preleveur={preleveur}
      />
    </>
  )
}

export default Page
