import {redirect} from 'next/navigation'

import {getCurrentUser} from '@/server/actions/user.js'

export const metadata = {
  title: 'Accueil'
}

const Home = async () => {
  const userResult = await getCurrentUser()
  const role = userResult?.data?.role

  if (role === 'ADMIN') {
    redirect('/tableau-de-bord')
  }

  if (role === 'INSTRUCTOR') {
    redirect('/tableau-de-bord')
  }

  if (role === 'DECLARANT') {
    redirect('/tableau-de-bord')
  }

  redirect('/login')
}

export default Home
