import PublicStats from '@/components/stats/public-stats.js'
import {getPublicStats} from '@/server/public-stats.js'

export const metadata = {
  title: 'Statistiques',
  description: 'Découvrez le déploiement, les remontées de données et l’utilisation de Partageons l’eau.'
}

export const dynamic = 'force-dynamic'

const StatsPage = async ({searchParams}) => {
  const parameters = await searchParams
  const {data, error} = await getPublicStats(parameters?.month)

  return <PublicStats data={data} error={error} />
}

export default StatsPage
