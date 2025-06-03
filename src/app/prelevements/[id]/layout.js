'use client'

import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Link from 'next/link'
import {useParams} from 'next/navigation'

const Layout = ({children}) => {
  const {id} = useParams()

  return (
    <>
      <div className='pt-5 pl-5'>
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
