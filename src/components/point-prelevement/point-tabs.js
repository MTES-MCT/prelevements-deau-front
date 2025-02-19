'use client'

import {Tab, Tabs} from '@mui/material'

const PointTabs = ({selectedTab, handleSelectedTab}) => (
  <Tabs
    value={selectedTab}
    variant='scrollable'
    scrollButtons='auto'
    onChange={handleSelectedTab}
  >
    <Tab value='identification' label='Identification' />
    <Tab value='localisation' label='Localisation' />
    <Tab value='exploitations' label='Exploitations' />
  </Tabs>
)

export default PointTabs
