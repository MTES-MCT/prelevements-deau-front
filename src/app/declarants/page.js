import {Button} from '@codegouvfr/react-dsfr/Button'

import DeclarantsList from '@/components/declarants/declarants-list.js'
import {RequireEditor} from '@/components/permissions/index.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarantsAction} from '@/server/actions/declarants.js'

export const metadata = {
  title: 'Déclarants'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const result = await getDeclarantsAction()
  const declarants = result.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <main className='min-h-screen bg-[#f7f7fb] pb-12'>
        <div className='fr-container pt-8 md:pt-10'>
          <div className='mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
            <div>
              <h1 className='fr-h2 fr-mb-1w'>Déclarants</h1>
              <p className='fr-text--sm fr-mb-0 max-w-3xl'>
                Retrouvez les préleveurs et les collecteurs. Les préleveurs peuvent être sans email ; les collecteurs doivent avoir un compte connecté.
              </p>
            </div>
            <RequireEditor>
              <Button
                priority='secondary'
                iconId='fr-icon-add-line'
                size='small'
                linkProps={{href: '/declarants/new'}}
                title='Ajouter un nouveau déclarant'
              >
                Ajouter un nouveau déclarant
              </Button>
            </RequireEditor>
          </div>

          <DeclarantsList declarants={declarants} />
        </div>
      </main>
    </>
  )
}

export default Page
