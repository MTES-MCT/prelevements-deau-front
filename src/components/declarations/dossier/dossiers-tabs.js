'use client'

import {useState} from 'react'

import {Tabs} from '@codegouvfr/react-dsfr/Tabs'
import {Tag} from '@codegouvfr/react-dsfr/Tag'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'

import DossiersFilters from '@/components/declarations/dossier/dossiers-filters.js'
import DossiersList from '@/components/declarations/dossiers-list.js'

const tabConfig = [
  {tabId: 'en-instruction', label: 'En cours d’instruction', statsKey: 'en-instruction'},
  {tabId: 'accepte', label: 'Acceptés', statsKey: 'accepte'},
  {tabId: 'refuse', label: 'Refusés', statsKey: 'refuse'},
  {tabId: 'en-construction', label: 'En construction', statsKey: 'en-construction'},
  {tabId: 'sans-suite', label: 'Classés sans suite', statsKey: 'sans-suite'},
  {tabId: 'archive', label: 'Archivés', statsKey: 'archive'}
]

const DossiersTabs = ({dossiersStats}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('en-instruction')

  const getFiltersFromURL = () => {
    const filters = {}
    for (const key of ['declarant', 'numeroDossier', 'periode', 'typePrelevement']) {
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

    router.replace(`${pathname}?${params.toString()}`)
  }

  if (!dossiersStats) {
    return null
  }

  return (
    <>
      <DossiersFilters filters={filters} setFilters={handleSetFilters} />
      <Tabs
        selectedTabId={activeTab}
        tabs={tabConfig.map(tab => ({
          tabId: tab.tabId,
          label: (
            <span>
              <Tag
                dismissible
                small
              >
                {dossiersStats[tab.statsKey] || 0}
              </Tag>
              <span className='fr-pl-1w'>{tab.label}</span>
            </span>
          )
        }))}
        onTabChange={setActiveTab}
      >
        <DossiersList status={activeTab} filters={filters} />
      </Tabs>
    </>
  )
}

export default DossiersTabs
