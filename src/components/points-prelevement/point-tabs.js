'use client'

import {Tab, Tabs} from '@mui/material'
import {useRouter, useParams} from 'next/navigation'

const PointTabs = ({selectedTab}) => {
  const router = useRouter()
  const {id} = useParams()

  const handleClick = (e, value) => {
    router.push(`/points-prelevement/${id}/${value}`)
  }

  return (
    <Tabs
      value={selectedTab}
      variant='scrollable'
      scrollButtons='auto'
      onChange={handleClick}
    >
      <Tab value='identification' label='Identification' />
      <Tab value='localisation' label='Localisation' />
      <Tab value='exploitations' label='Exploitations' />
    </Tabs>
  )
}

export default PointTabs
