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
    const permissions = new Set(userResult.data?.permissions || [])
    const firstAccessibleRoute = [
      ['zone.dashboard.read', '/tableau-de-bord'],
      ['declaration.list', '/declarations'],
      ['pp.map.read', '/points-prelevement'],
      ['declarant.list', '/declarants'],
      ['zone.detail.read', '/zones'],
      ['export.volumes', '/exports']
    ].find(([permission]) => permissions.has(permission))?.[1]

    redirect(firstAccessibleRoute || '/mon-compte')
  }

  if (role === 'DECLARANT') {
    redirect('/tableau-de-bord')
  }

  redirect('/login')
}

export default Home
