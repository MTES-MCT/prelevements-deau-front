'use client'

import {useEffect, useState} from 'react'

import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {Tab, Tabs} from '@mui/material'
import Link from 'next/link'
import {useRouter, useParams, usePathname} from 'next/navigation'

const PointTabs = () => {
  const router = useRouter()
  const {id} = useParams()
  const url = usePathname()
  const [path, setPath] = useState('identification')

  const handleClick = (e, value) => {
    router.push(`/prelevements/${id}/${value}`)
  }

  useEffect(() => {
    if (url) {
      const parts = url.split('/').filter(Boolean)

      // Lorsque l'url fini par l'id, on reste sur 'identification'
      if (parts.length !== 2) {
        setPath(parts.at(-1))
      }
    }
  }, [url])

  return (
    <>
      <div className='pt-5 pl-5'>
        <ArrowBackIcon className='pr-1' />
        <Link href={`/prelevements?point-prelevement=${id}`}>Retour</Link>
      </div>
      <div className='fr-container'>
        <Tabs
          value={path}
          variant='scrollable'
          scrollButtons='auto'
          onChange={handleClick}
        >
          <Tab value='identification' label='Identification' />
          <Tab value='localisation' label='Localisation' />
          <Tab value='exploitations' label='Exploitations' />
        </Tabs>
      </div>
    </>
  )
}

export default PointTabs
