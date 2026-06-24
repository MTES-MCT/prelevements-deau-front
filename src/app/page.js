import {redirect} from 'next/navigation'

import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {
  title: 'Accueil'
}

const Home = async () => {
  const userResult = await getCurrentUser()
  const role = userResult?.data?.role

  if (role === 'INSTRUCTOR' || role === 'ADMIN') {
    redirect('/zones')
  }

  if (role === 'DECLARANT') {
    redirect('/mes-declarations')
  }

  redirect('/login')
}

export default Home
