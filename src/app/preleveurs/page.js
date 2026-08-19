import {Box, Typography} from '@mui/material'
import {redirect} from 'next/navigation'

import DeclarantsList from '@/components/declarants/declarants-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  buildDeclarantsSearchQuery,
  readDeclarantsSearchOptions
} from '@/lib/declarant-search.js'
import {searchCollecteurPreleveursAction} from '@/server/actions/declarants.js'

export const metadata = {
  title: 'Préleveurs'
}

export const dynamic = 'force-dynamic'

const Page = async ({searchParams}) => {
  const options = {
    ...readDeclarantsSearchOptions(await searchParams),
    role: null,
    collecteurStatus: null
  }
  const result = await searchCollecteurPreleveursAction(options)
  const searchResult = result.data || {
    items: [],
    total: 0,
    page: options.page,
    pageSize: options.pageSize,
    totalPages: 1,
    counts: {
      total: 0,
      preleveurs: 0,
      collecteurs: 0,
      withoutEmail: 0
    },
    facets: {}
  }

  if (searchResult.page > searchResult.totalPages) {
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
      </Box>
    </>
  )
}

export default Page
