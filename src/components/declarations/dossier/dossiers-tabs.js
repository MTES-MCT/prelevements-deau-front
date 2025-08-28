'use client'

import {useState} from 'react'

import {Tabs} from '@codegouvfr/react-dsfr/Tabs'
import {Tag} from '@codegouvfr/react-dsfr/Tag'

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
  const [activeTab, setActiveTab] = useState('en-instruction')
  const [filters, setFilters] = useState({})

  return (
    <>
      <DossiersFilters setFilters={setFilters} />
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
        <DossiersList status={activeTab || 'en-instruction'} filters={filters} />
      </Tabs>
    </>
  )
}

export default DossiersTabs
