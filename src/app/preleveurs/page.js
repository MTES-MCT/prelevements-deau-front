import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {redirect} from 'next/navigation'

import DeclarantsList from '@/components/declarants/declarants-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  buildDeclarantsPathname,
  buildDeclarantsSearchQuery,
  hasNonCanonicalDeclarantsSort,
  isDeclarantsSearchResult,
  readDeclarantsSearchOptions
} from '@/lib/declarant-search.js'
import {searchCollecteurPreleveursAction} from '@/server/actions/declarants.js'

export const metadata = {
  title: 'Préleveurs'
}

export const dynamic = 'force-dynamic'

const Page = async ({searchParams}) => {
  const resolvedSearchParams = await searchParams
  const parsedOptions = readDeclarantsSearchOptions(resolvedSearchParams)

  const shouldRemoveUnsupportedFilters = resolvedSearchParams.role
    || resolvedSearchParams.collecteurStatus
    || resolvedSearchParams.collecteur
  const shouldRemoveRelevanceSort = hasNonCanonicalDeclarantsSort(parsedOptions)

  if (shouldRemoveUnsupportedFilters || shouldRemoveRelevanceSort) {
    redirect(buildDeclarantsPathname('/preleveurs', resolvedSearchParams, {
      role: null,
      collecteurStatus: null,
      collecteur: null,
      ...(shouldRemoveRelevanceSort && {page: null, sort: null})
    }))
  }

  const options = {
    ...parsedOptions,
    role: null,
    collecteurStatus: null
  }
  const result = await searchCollecteurPreleveursAction(options)
  const hasSearchError = !result.success || !isDeclarantsSearchResult(result.data)
  const searchResult = hasSearchError ? null : result.data

  if (searchResult && searchResult.page > searchResult.totalPages) {
    const query = buildDeclarantsSearchQuery({
      ...options,
      page: searchResult.totalPages
    })
    redirect(`/preleveurs?${query}`)
  }

  return (
    <>
      <StartDsfrOnHydration />

      <main className='min-h-screen bg-[#f7f7fb] pb-12'>
        <div className='fr-container pt-8 md:pt-10'>
          <div className='mb-6'>
            <h1 className='fr-h2 fr-mb-1w'>Préleveurs</h1>
            <p className='fr-text--sm fr-mb-0 max-w-3xl'>
              Retrouvez les préleveurs dont votre compte collecteur suit au moins un point.
            </p>
          </div>

          {hasSearchError
            ? (
              <Alert
                description='La liste des préleveurs ne peut pas être affichée pour le moment.'
                severity='error'
                title='Liste indisponible'
              />
            )
            : (
              <DeclarantsList
                basePath='/preleveurs'
                declarants={searchResult.items}
                facets={searchResult.facets}
                filters={options}
                listKind='preleveurs'
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
