'use client'

import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Link from 'next/link'
import {useParams} from 'next/navigation'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Layout = ({children}) => {
  const {id} = useParams()

  return (
    <>
      <StartDsfrOnHydration />

      <div className='p-5'>
        <ArrowBackIcon className='pr-1' />
        <Link href={`/prelevements?point-prelevement=${id}`}>Retour</Link>
      </div>
      <div className='fr-container h-full'>
        {children}
      </div>
    </>
  )
}

export default Layout
