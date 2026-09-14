import PublicStats from '@/components/stats/public-stats.js'
import {getPublicStatsPage} from '@/server/public-stats.js'

export const metadata = {
  title: 'Statistiques',
  description: 'Découvrez le déploiement, les remontées de données et l’utilisation de Partageons l’eau.'
}

export const dynamic = 'force-dynamic'

const StatsPage = async ({searchParams}) => {
  const parameters = await searchParams
  const stats = await getPublicStatsPage(parameters?.month)

  return <PublicStats {...stats} />
}

export default StatsPage
