import {Box, Typography} from '@mui/material'

import {getStats} from '@/app/api/points-prelevement.js'
import Counter from '@/components/counter.js'
import Pie from '@/components/pie.js'
import DebitsReservesChart from '@/components/points-prelevement/debits-reserves-chart.js'
import DocumentChart from '@/components/points-prelevement/documents-chart.js'
import RegularisationsCharts from '@/components/points-prelevement/regularisations-chart.js'
import SidedSection from '@/components/ui/SidedSection/index.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Page = async () => {
  const stats = await getStats()
  const {activPointsPrelevementCount, pointsCount, documents, regularisations, debitsReserves} = stats
  const unactivPoints = pointsCount - activPointsPrelevementCount

  return (
    <>
      <StartDsfrOnHydration />

      <Typography className='text-center pt-10' variant='h3'>Statistiques</Typography>

      <SidedSection
        title='Statut d’exploitation des points de prélèvement'
        subtitle='Lorsque plusieurs exploitations sont associées à un même point de prélèvement, le statut indiqué est le statut global du point de prélèvement (par exemple, tant qu’au moins une exploitation est en activité, alors le point est globalement considéré comme en activité)'
        firstContent={(
          <Counter
            label='Nombre total de points de prélèvements :'
            number={pointsCount}
          />
        )}
        secondContent={(
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
        )}
      />

      <SidedSection
        background='secondary'
        title='Documents associés aux exploitations'
        subtitle='Les prélèvements d’eau sont encadrés par des autorisations administratives définissant les modalités d’exploitations. Ce graphique montre le nombre de documents selon leur date de signature. Les délibérations d’abandon et rapports hydrogéologiques agréés, bien que n’étant pas des autorisations, sont également rassemblées car ils ont des incidences sur l’exploitation des points de prélèvement.'
      >
        <DocumentChart data={documents} />
      </SidedSection>

      <SidedSection
        title='Régularisation des exploitations'
        subtitle='Avancement de la régularisation administrative des exploitations en activité à ce jour. Pour chaque régime, il est indiqué le nombre d’exploitations autorisées et le nombre d’exploitations relevant de ce régime mais ne disposant pas d’autorisation à ce jour au titre de ce régime. Pour les IOTA, les chiffres doivent encore être affinés pour tenir compte des volumes effectivement prélevés par rapport aux seuils de la nomenclature IOTA. A noter qu’une exploitation peut relever de différents régimes.'
      >
        <Box className='fr-container pt-4'>
          <RegularisationsCharts data={regularisations} />
        </Box>
      </SidedSection>

      <SidedSection
        background='secondary'
        title='Définition d’un débit réservé'
        subtitle='Le graphique représente le pourcentage d’exploitations dont les autorisations définissent une valeur de débit réservé. Seuls les prélèvements de surface sont pris en compte, hors sources.'
      >
        <Box className='fr-container pt-4'>
          <DebitsReservesChart data={debitsReserves} />
        </Box>
      </SidedSection>

    </>
  )
}

export default Page
