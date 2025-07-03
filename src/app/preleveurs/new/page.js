import dynamic from 'next/dynamic'

import PreleveurCreationForm from '@/components/form/preleveur-creation-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const DynamicBreadcrumb = dynamic(
  () => import('@codegouvfr/react-dsfr/Breadcrumb')
)

const Page = () => (
  <>
    <StartDsfrOnHydration />

    <div className='fr-container'>
      <DynamicBreadcrumb
        currentPageLabel='Création'
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
    <PreleveurCreationForm />
  </>
)

export default Page
