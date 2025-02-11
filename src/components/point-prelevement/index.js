'use client'

import {useState} from 'react'

import PointIdentification from './point-identification.js'
import PointLocalistation from './point-localisation.js'
import PointTabs from './point-tabs.js'

const PointPrelevement = ({pointPrelevement, lienInfoterre, lienOuvrageBnpe, commune}) => {
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
          lienInfoterre={lienInfoterre}
          lienOuvrageBnpe={lienOuvrageBnpe}
        />
      )}
      {selectedTab === 'localisation' && (
        <PointLocalistation
          pointPrelevement={pointPrelevement}
          commune={commune}
        />
      )}
    </>
  )
}

export default PointPrelevement
