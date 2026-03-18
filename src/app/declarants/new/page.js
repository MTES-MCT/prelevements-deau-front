import dynamic from 'next/dynamic'

import PreleveurForm from '@/components/form/preleveur-form.js'
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
    <PreleveurForm />
  </>
)

export default Page
