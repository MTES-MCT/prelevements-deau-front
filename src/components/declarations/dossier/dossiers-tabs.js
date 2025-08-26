'use client'

import {useState} from 'react'

import {Tabs} from '@codegouvfr/react-dsfr/Tabs'
import {Tag} from '@codegouvfr/react-dsfr/Tag'

import DossiersList from '@/components/declarations/dossiers-list.js'

const CounterTab = ({count}) => (
  <Tag
    dismissible // Pour avoir la couleur de fond bleue
    small
  >
    {count}
  </Tag>
)

const DossiersTabs = ({dossiersStats}) => {
  const [activeTab, setActiveTab] = useState('en-instruction')

  return (
    <Tabs
      selectedTabId={activeTab}
      tabs={[
        {
          tabId: 'en-instruction',
          label: (
            <span>
              <CounterTab count={dossiersStats['en-instruction'] || 0} /> En cours d’instruction
            </span>
          )
        },
        {
          tabId: 'accepte',
          label: (
            <span>
              <CounterTab count={dossiersStats.accepte || 0} /> Acceptés
            </span>
          )
        },
        {
          tabId: 'refuse',
          label: (
            <span>
              <CounterTab count={dossiersStats.refuse || 0} /> Refusés
            </span>
          )
        },
        {
          tabId: 'en-construction',
          label: (
            <span>
              <CounterTab count={dossiersStats['en-construction'] || 0} /> En construction
            </span>
          )
        },
        {
          tabId: 'sans-suite',
          label: (
            <span>
              <CounterTab count={dossiersStats['sans-suite'] || 0} /> Classés sans suite
            </span>
          )
        },
        {
          tabId: 'archive',
          label: (
            <span>
              <CounterTab count={dossiersStats.archive || 0} /> Archivés
            </span>
          )
        }
      ]}
      onTabChange={setActiveTab}
    >
      <DossiersList status={activeTab} />
    </Tabs>
  )
}

export default DossiersTabs
