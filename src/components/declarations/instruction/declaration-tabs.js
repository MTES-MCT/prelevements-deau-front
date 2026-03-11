'use client'

import {useCallback, useState} from 'react'

import dynamic from 'next/dynamic.js'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'

import DeclarationFilters from '@/components/declarations/instruction/declaration-filters.js'
import DeclarationList from '@/components/declarations/instruction/declaration-list.js'

const DynamicTabs = dynamic(
  () => import('@codegouvfr/react-dsfr/Tabs'),
  {ssr: false}
)
const tabConfig = [
  {tabId: 'a-traiter', label: 'À traiter', statsKey: 'en-instruction'},
  {tabId: 'traites', label: 'Traités', statsKey: 'traites'}
]

const DeclarationTabs = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabFromURL = searchParams.get('status')
  const [activeTab, setActiveTab] = useState(tabFromURL || 'a-traiter')
  const [periodOptions, setPeriodOptions] = useState([{value: 'all', label: 'Tout'}])

  const getFiltersFromURL = () => {
    const filters = {}
    for (const key of ['declarant', 'dossierNumber', 'periode']) {
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

    params.set('status', activeTab)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleTabChange = tabId => {
    setActiveTab(tabId)
    const params = new URLSearchParams(searchParams.toString())
    params.set('status', tabId)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleAvailablePeriodsChange = useCallback(options => {
    setPeriodOptions(options?.length ? options : [{value: 'all', label: 'Tout'}])
  }, [])

  return (
    <DynamicTabs
      className='fr-mt-4w'
      selectedTabId={activeTab}
      tabs={tabConfig.map(status => ({
        tabId: status.tabId,
        label: status.label
      }))}
      onTabChange={handleTabChange}
    >
      <DeclarationFilters
        filters={filters}
        setFilters={handleSetFilters}
        periodOptions={periodOptions}
      />
      <DeclarationList
        status={activeTab}
        filters={filters}
        onAvailablePeriodsChange={handleAvailablePeriodsChange}
      />
    </DynamicTabs>
  )
}

export default DeclarationTabs
