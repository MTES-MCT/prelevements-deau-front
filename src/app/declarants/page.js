import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {forbidden, redirect} from 'next/navigation'

import DeclarantsList from '@/components/declarants/declarants-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  buildDeclarantsPathname,
  buildDeclarantsSearchQuery,
  hasNonCanonicalDeclarantsSort,
  isDeclarantsSearchResult,
  readDeclarantsSearchOptions
} from '@/lib/declarant-search.js'
import {searchDeclarantsAction} from '@/server/actions/declarants.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'

export const metadata = {
  title: 'Déclarants'
}

export const dynamic = 'force-dynamic'

const Page = async ({searchParams}) => {
  const resolvedSearchParams = await searchParams
  const options = readDeclarantsSearchOptions(resolvedSearchParams)

  if (hasNonCanonicalDeclarantsSort(options)) {
    redirect(buildDeclarantsPathname('/declarants', resolvedSearchParams, {
      page: null,
      sort: null
    }))
  }

  const [result, userResult] = await Promise.all([
    searchDeclarantsAction(options),
    getCurrentSessionInfo()
  ])
  const currentUser = userResult.data

  if (currentUser?.role === 'INSTRUCTOR'
    && !currentUser.permissions?.includes('declarant.list')) {
    forbidden()
  }

  const hasSearchError = !result.success || !isDeclarantsSearchResult(result.data)
  const searchResult = hasSearchError ? null : result.data

  if (searchResult && searchResult.page > searchResult.totalPages) {
    const query = buildDeclarantsSearchQuery({
      ...options,
      page: searchResult.totalPages
    })
    redirect(`/declarants?${query}`)
  }

  const canCreateDeclarant = currentUser?.role === 'ADMIN'
    || (currentUser?.role === 'INSTRUCTOR'
      && currentUser.permissions?.includes('declarant.create'))

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
            {canCreateDeclarant && (
              <Button
                priority='secondary'
                iconId='fr-icon-add-line'
                size='small'
                linkProps={{href: '/declarants/new'}}
                title='Ajouter un nouveau déclarant'
              >
                Ajouter un nouveau déclarant
              </Button>
            )}
          </div>

          {hasSearchError
            ? (
              <Alert
                description='La liste des déclarants ne peut pas être affichée pour le moment.'
                severity='error'
                title='Liste indisponible'
              />
            )
            : (
              <DeclarantsList
                declarants={searchResult.items}
                facets={searchResult.facets || {}}
                filters={options}
                page={searchResult.page}
                pageSize={searchResult.pageSize}
                total={searchResult.total}
                totalPages={searchResult.totalPages}
              />
            )}
        </div>
      </main>
    </>
  )
}

export default Page
