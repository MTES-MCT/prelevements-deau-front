import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {redirect} from 'next/navigation'

import AgentsList from '@/components/agents/agents-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  buildAgentsPathname,
  buildAgentsSearchQuery,
  getCanonicalAgentsSort,
  hasNonCanonicalAgentsSort,
  isAgentsSearchResult,
  readAgentsSearchOptions
} from '@/lib/agent-search.js'
import {listAgentsAction} from '@/server/actions/agents.js'

export const metadata = {
  title: 'Agents'
}

export const dynamic = 'force-dynamic'

const AgentsPage = async ({searchParams}) => {
  const resolvedSearchParams = await searchParams
  const options = readAgentsSearchOptions(resolvedSearchParams)

  if (hasNonCanonicalAgentsSort(options)) {
    const canonicalSort = getCanonicalAgentsSort(options)

    redirect(buildAgentsPathname('/agents', resolvedSearchParams, {
      page: null,
      ...canonicalSort
    }))
  }

  const result = await listAgentsAction(options)
  const hasSearchError = !result.success || !isAgentsSearchResult(result.data)
  const searchResult = hasSearchError ? null : result.data

  if (searchResult && searchResult.page > searchResult.totalPages) {
    const query = buildAgentsSearchQuery({
      ...options,
      page: searchResult.totalPages
    })
    redirect(`/agents?${query}`)
  }

  return (
    <>
      <StartDsfrOnHydration />

      <main className='min-h-screen bg-[#f7f7fb] pb-12'>
        <div className='fr-container pt-8 md:pt-10'>
          <div className='mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
            <div>
              <h1 className='fr-h2 fr-mb-1w'>Agents</h1>
              <p className='fr-text--sm fr-mb-0 max-w-3xl'>
                Gérez les comptes agents et leurs accès aux différentes zones.
              </p>
            </div>
            <Button
              priority='secondary'
              iconId='fr-icon-add-line'
              size='small'
              linkProps={{href: '/agents/ajouter'}}
            >
              Ajouter un agent
            </Button>
          </div>

          {hasSearchError
            ? (
              <Alert
                description={result.error || 'La liste des agents ne peut pas être affichée pour le moment.'}
                severity='error'
                title='Liste indisponible'
              />
            )
            : (
              <AgentsList
                agents={searchResult.items}
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

export default AgentsPage
