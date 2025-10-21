'use client'

import {useState} from 'react'

import dynamic from 'next/dynamic.js'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'

import DossiersFilters from '@/components/declarations/dossier/dossiers-filters.js'
import DossiersList from '@/components/declarations/dossiers-list.js'

const DynamicTabs = dynamic(
  () => import('@codegouvfr/react-dsfr/Tabs'),
  {ssr: false}
)
const tabConfig = [
  {tabId: 'en-instruction', label: 'En cours d’instruction', statsKey: 'en-instruction'},
  {tabId: 'accepte', label: 'Acceptés', statsKey: 'accepte'},
  {tabId: 'refuse', label: 'Refusés', statsKey: 'refuse'},
  {tabId: 'en-construction', label: 'En construction', statsKey: 'en-construction'},
  {tabId: 'sans-suite', label: 'Classés sans suite', statsKey: 'sans-suite'},
  {tabId: 'archive', label: 'Archivés', statsKey: 'archive'}
]

const DossiersTabs = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabFromURL = searchParams.get('statut')
  const [activeTab, setActiveTab] = useState(tabFromURL || 'en-instruction')

  const getFiltersFromURL = () => {
    const filters = {}
    for (const key of ['declarant', 'dossierNumber', 'periode', 'typePrelevement']) {
      const value = searchParams.get(key)
      if (value) {
        filters[key] = value
      }
    }

    return filters
  }

  const filters = getFiltersFromURL()

  const handleSetFilters = updater => {
    const next = updater(filters)
    const params = new URLSearchParams()

    for (const [key, value] of Object.entries(next)) {
      if (value && value !== 'all') {
        params.set(key, value)
      }
    }

    params.set('statut', activeTab)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleTabChange = tabId => {
    setActiveTab(tabId)
    const params = new URLSearchParams(searchParams.toString())
    params.set('statut', tabId)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <DynamicTabs
      className='fr-mt-4w'
      selectedTabId={activeTab}
      tabs={tabConfig.map(statut => ({
        tabId: statut.tabId,
        label: statut.label
      }))}
      onTabChange={handleTabChange}
    >
      <DossiersFilters filters={filters} setFilters={handleSetFilters} />
      <DossiersList status={activeTab} filters={filters} />
    </DynamicTabs>
  )
}

export default DossiersTabs
