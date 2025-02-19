'use client'

import {useState} from 'react'

import PointExploitations from './point-exploitations.js'
import PointIdentification from './point-identification.js'
import PointLocalistation from './point-localisation.js'
import PointTabs from './point-tabs.js'

const PointPrelevement = ({pointPrelevement}) => {
  const [selectedTab, setSelectedTab] = useState('identification')

  const handleSelectedTab = (event, newValue) => {
    setSelectedTab(newValue)
  }

  return (
    <>
      <PointTabs selectedTab={selectedTab} handleSelectedTab={handleSelectedTab} />
      {selectedTab === 'identification' && (
        <PointIdentification
          pointPrelevement={pointPrelevement}
        />
      )}
      {selectedTab === 'localisation' && (
        <PointLocalistation
          pointPrelevement={pointPrelevement}
        />
      )}
      {selectedTab === 'exploitations' && (
        <PointExploitations
          pointPrelevement={pointPrelevement}
        />
      )}
    </>
  )
}

export default PointPrelevement
