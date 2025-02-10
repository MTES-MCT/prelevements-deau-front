'use client'

import {Tab, Tabs, useMediaQuery} from '@mui/material'
import {useTheme} from '@mui/material/styles'

const PointTabs = ({selectedTab, handleSelectedTab}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Tabs
      value={selectedTab}
      variant={isMobile ? 'scrollable' : 'standard'}
      scrollButtons={isMobile ? 'auto' : 'off'}
      onChange={handleSelectedTab}
    >
      <Tab value='identification' label='Identification' />
      <Tab value='localisation' label='Localisation' />
      <Tab value='exploitations' label='Exploitations' />
      <Tab value='suivis' label='Suivis' />
    </Tabs>
  )
}

export default PointTabs
