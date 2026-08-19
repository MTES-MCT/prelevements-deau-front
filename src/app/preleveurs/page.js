import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box, Typography} from '@mui/material'
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

      <Box className='flex flex-col fr-container h-full w-full'>
        <div className='flex justify-between items-end'>
          <Typography variant='h4' className='fr-pt-3w'>Préleveurs</Typography>
        </div>
        <p className='fr-text--sm fr-mt-2w'>
          Ces préleveurs sont accessibles car votre compte collecteur est rattaché à leurs exploitations.
        </p>
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
              counts={searchResult.counts}
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
      </Box>
    </>
  )
}

export default Page
