import dynamic from 'next/dynamic'
import {forbidden} from 'next/navigation'

import PreleveurForm from '@/components/form/preleveur-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {canCurrentUserCreateDeclarant} from '@/server/permissions/declarants.js'

const DynamicBreadcrumb = dynamic(
  () => import('@codegouvfr/react-dsfr/Breadcrumb')
)

export const metadata = {
  title: 'Nouveau déclarant'
}

const Page = async ({searchParams}) => {
  const resolvedSearchParams = await searchParams
  const canCreateDeclarant = await canCurrentUserCreateDeclarant({
    zoneId: resolvedSearchParams?.zoneId || null
  })

  if (!canCreateDeclarant) {
    forbidden()
  }

  return (
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
              label: 'Déclarants',
              linkProps: {
                href: '/declarants'
              }
            }
          ]}
        />
      </div>
      <PreleveurForm />
    </>
  )
}

export default Page
