import {Box, Typography} from '@mui/material'

import {getStats} from '@/app/api/points-prelevement.js'
import Counter from '@/components/counter.js'
import Pie from '@/components/pie.js'
import DebitsReservesChart from '@/components/prelevements/debits-reserves-chart.js'
import DocumentChart from '@/components/prelevements/documents-chart.js'
import RegularisationsCharts from '@/components/prelevements/regularisations-chart.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Page = async () => {
  const stats = await getStats()
  const {activPointsPrelevementCount, pointsCount, documents, regularisations, debitsReserves} = stats
  const unactivPoints = pointsCount - activPointsPrelevementCount

  return (
    <>
      <StartDsfrOnHydration />

      <Typography className='text-center pt-10' variant='h3'>Statistiques</Typography>
      <Box className='fr-container text-center pt-12'>
        <Typography variant='h6'>Statut d’exploitation des points de prélèvement</Typography>
        <Typography variant='body1' className='pt-4'>
          Lorsque plusieurs exploitations sont associées à un même point de prélèvement, le statut indiqué est le statut global du point de prélèvement (par exemple, tant qu’au moins une exploitation est en activité, alors le point est globalement considéré comme en activité)
        </Typography>
      </Box>
      <Box className='w-full flex flex-wrap justify-between items-center m-auto py-8' sx={{maxWidth: '1200px'}}>
        <Box className='flex m-auto'>
          <Counter
            label='Nombre total de points de prélèvements :'
            number={pointsCount}
          />
        </Box>
        <Box
          sx={{
            width: '100%',
            maxWidth: '500px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'end'
          }}
        >
          <Pie
            data={[
              {
                id: 'unactivPoints',
                value: unactivPoints,
                label: 'Terminés'
              },
              {
                id: 'activPoints',
                value: activPointsPrelevementCount,
                label: 'En activité'
              }
            ]}
          />
        </Box>
      </Box>
      <hr />
      <Box className='fr-container text-center pt-12'>
        <Typography variant='h6'>Documents associés aux exploitations</Typography>
        <Typography variant='body1' className='pt-4'>
          Les prélèvements d’eau sont encadrés par des autorisations administratives définissant les modalités d’exploitations. Ce graphique montre le nombre de documents selon leur date de signature. Les délibérations d’abandon et rapports hydrogéologiques agréés, bien que n’étant pas des autorisations, sont également rassemblées car ils ont des incidences sur l’exploitation des points de prélèvement.
        </Typography>
      </Box>
      <Box className='fr-container pt-4' >
        <DocumentChart data={documents} />
      </Box>
      <hr />
      <Box className='fr-container text-center pt-12'>
        <Typography variant='h6'>Régularisation des exploitations</Typography>
        <Typography variant='body1' className='pt-4'>
          Avancement de la régularisation administrative des exploitations en activité à ce jour. Pour chaque régime, il est indiqué le nombre d’exploitations autorisées et le nombre d’exploitations relevant de ce régime mais ne disposant pas d’autorisation à ce jour au titre de ce régime. Pour les IOTA, les chiffres doivent encore être affinés pour tenir compte des volumes effectivement prélevés par rapport aux seuils de la nomenclature IOTA. A noter qu’une exploitation peut relever de différents régimes.
        </Typography>
      </Box>
      <Box className='fr-container pt-4' >
        <RegularisationsCharts data={regularisations} />
      </Box>
      <hr />
      <Box className='fr-container text-center pt-12'>
        <Typography variant='h6'>Définition d’un débit réservé</Typography>
        <Typography variant='body1' className='pt-4'>
          Le graphique représente le pourcentage d’exploitations dont les autorisations définissent une valeur de débit réservé. Seuls les prélèvements de surface sont pris en compte, hors sources.
        </Typography>
      </Box>
      <Box className='fr-container pt-4' >
        <DebitsReservesChart data={debitsReserves} />
      </Box>
    </>
  )
}

export default Page
