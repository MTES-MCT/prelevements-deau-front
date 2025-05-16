import {fr} from '@codegouvfr/react-dsfr'
import {Box, Typography} from '@mui/material'
import Image from 'next/image'
import Link from 'next/link'

import {getStats} from '@/app/api/points-prelevement.js'
import Counter from '@/components/counter.js'
import Pie from '@/components/pie.js'

const Home = async () => {
  const stats = await getStats()

  return (
    <Box>
      <Box
        sx={{
          p: 5,
          backgroundColor: fr.colors.decisions.background.alt.blueFrance.default
        }}
      >
        <Box className='fr-container fr-grid-row fr-col-12 flex justify-between'>
          <Box className='fr-col-12 fr-col-lg-6'>
            <Typography variant='h1' className='fr-my-3w'>
              Bienvenue sur le portail régional de suivi des prélèvements d’eau !
            </Typography>
            <Typography variant='body1' className='fr-mb-3w'>
              Ce site permet de rassembler les données sur les prélèvements d’eau réalisés dans les nappes souterraines et les cours d’eau de La Réunion, tous usages confondus.
            </Typography>
            <Link href='/prelevements' className='fr-btn fr-btn--secondary'>Accéder à la carte des points de prélèvements</Link>
          </Box>
          <Box
            className='fr-col-12 fr-col-lg-6 mt-5'
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: 500,
              height: 400
            }}
          >
            <Image
              fill
              priority
              sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
              src='/images/capture-carte-points-prelevement.jpg'
              style={{
                objectFit: 'cover'
              }}
              alt='Capture de la carte des points de prélèvements'
            />
          </Box>
        </Box>
      </Box>
      <Box className='flex flex-wrap justify-between items-center m-auto pt-8' sx={{maxWidth: '1200px'}}>
        <Box className='flex m-auto'>
          <Counter
            label='Nombre de point de prélèvement en activité : '
            number={stats.activPointsPrelevementCount}
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
              {id: 'surface', value: stats.activPointsSurfaceCount, label: 'Surface'},
              {id: 'souterrain', value: stats.activPointsSouterrainCount, label: 'Souterrain'}
            ]}
          />
        </Box>
      </Box>
      <Box className='m-auto py-8' sx={{maxWidth: '1200px'}}>
        <Typography variant='body1' className='p-5'>
          Il s’agit d’un outil d’aide à la décision, <b>destiné à faciliter l’évaluation et le suivi dans le temps des impacts des prélèvements sur les milieux.</b> Il s’adresse aussi bien aux services en charge de l’instruction et du contrôle des autorisations administratives qu’aux préleveurs bénéficiaires de ces autorisations. Les établissements publics, collectivités ou encore le grand public y trouveront également des informations utiles à la compréhension et la mise en œuvre d’une gestion globale et concertée de la ressource en eau, telle que prévue par le Schéma directeur d’aménagement et de gestion des eaux (SDAGE) de La Réunion.
        </Typography>
        <Typography variant='body1' className='p-5'>
          Basé sur une cartographie qui se veut exhaustive, l’outil décrit les <b>modalités d’exploitations des points de prélèvement</b> en activité ou passés (bénéficiaires, autorisations délivrées, volumes autorisés et valeurs seuils à respecter…) et valorise les <b>données de suivi collectées en continu</b>.
        </Typography>
        <Typography variant='body1' className='p-5'>
          Depuis 2024, ces dernières sont transmises mensuellement par les préleveurs via un formulaire en ligne (<a href='https://www.demarches-simplifiees.fr/commencer/suivi-prelevements-eau-974'>https://www.demarches-simplifiees.fr/commencer/suivi-prelevements-eau-974)</a>. A ce jour, tous les prélèvements sont concernés sauf ceux soumis au régime des installations classées pour la protection de l’environnement (ICPE) ou des concessions hydroélectriques.
        </Typography>
        <Typography variant='body1' className='p-5'>
          Identifié par le SDAGE 2022-2027, le projet « suivi des prélèvements d’eau » est porté par la DEAL de La Réunion depuis 2022, en lien étroit avec ses partenaires locaux (ARS, Office de l’eau, BRGM). Il s’appuie sur un travail de longue haleine de structuration des données. Depuis 2023, il bénéficie de l’appui financier de la <a href='https://beta.gouv.fr/incubateurs/mtes.html'>Fabrique numérique</a>, l’incubateur de « startups d’Etat » du ministère en charge de l’écologie.
        </Typography>
      </Box>
      <Box
        sx={{
          backgroundColor: fr.colors.decisions.background.alt.blueFrance.default,
          p: '3em'
        }}
      >
        <Box
          className='fr-container flex flex-wrap justify-between items-center'
        >
          <Counter
            label='Nombre de préleveurs actifs : '
            number={stats.activPreleveursCount}
          />
          <Box>
            <Link href='/preleveurs' className='fr-btn fr-btn--secondary'>
              Accéder à la liste des préleveurs
            </Link>
          </Box>
        </Box>
      </Box>
      <Box className='w-full flex justify-center p-12'>
        <Link href='/statistiques' className='fr-btn fr-btn--secondary'>
          Afficher plus de statistiques
        </Link>
      </Box>
    </Box>
  )
}

export default Home
