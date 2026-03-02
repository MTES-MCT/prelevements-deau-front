import {Box, Typography} from '@mui/material'
import Image from 'next/image'
import Link from 'next/link'

import Counter from '@/components/ui/Counter/index.js'
import SidedSection from '@/components/ui/SidedSection/index.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getPointsPrelevementURL} from '@/lib/urls.js'

const TerritorySection = ({title, description, imageSrc, imageAlt, activePointsCount}) => (
  <SidedSection
    firstContent={
      <Box className='flex flex-col gap-4'>
        <Typography variant='h2' className='fr-my-1w'>
          {title}
        </Typography>

        <Typography variant='body1'>{description}</Typography>

        <Counter label='Points en activité : ' number={activePointsCount} />
      </Box>
    }
    secondContent={
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 560,
          height: 380
        }}
      >
        <Image
          fill
          priority
          sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
          src={imageSrc}
          style={{objectFit: 'cover'}}
          alt={imageAlt}
        />
      </Box>
    }
  />
)

const Home = () => {
  const activePointsReunion = 363
  const activePointsBlv = 811
  const activePointsTotal = activePointsReunion + activePointsBlv

  return (
    <>
      <StartDsfrOnHydration />

      <SidedSection
        background='secondary'
        firstContent={
          <Box className='flex flex-col gap-6'>
            <Typography variant='h1' className='fr-my-2w'>
              Suivi des prélèvements d’eau
            </Typography>

            <Typography variant='body1'>
              Cartographie et suivi des points de prélèvement en eau à <b>La Réunion</b>, avec un focus sur le{' '}
              <b>SAGE Bièvre Liers Valloire</b>.
            </Typography>

            <Link href={getPointsPrelevementURL()} className='fr-btn fr-btn--secondary'>
              Accéder à la carte des points de prélèvement
            </Link>
          </Box>
        }
        secondContent={
          <Box className='fr-p-3w'>
            <Counter label='Points en activité : ' number={activePointsTotal} />
          </Box>
        }
      />

      <TerritorySection
        title='La Réunion'
        description='Vue régionale des points de prélèvement et de leurs informations principales.'
        activePointsCount={activePointsReunion}
        imageSrc='/images/points-prelevements-reunion.jpg'
        imageAlt='Carte des points de prélèvements à La Réunion'
      />

      <TerritorySection
        title='SAGE Bièvre Liers Valloire'
        description='Vue locale des points de prélèvement sur le territoire du SAGE Bièvre Liers Valloire.'
        activePointsCount={activePointsBlv}
        imageSrc='/images/points-prelevements-blv.jpg'
        imageAlt='Carte des points de prélèvements du SAGE Bièvre Liers Valloire'
      />

      <SidedSection background='secondary'>
        <Box className='flex flex-col gap-10'>
          <Typography variant='body1'>
            Il s’agit d’un outil d’aide à la décision, <b>destiné à faciliter l’évaluation et le suivi dans le temps des
              impacts des prélèvements sur les milieux.</b> Il s’adresse aussi bien aux services en charge de l’instruction
            et du contrôle des autorisations administratives qu’aux préleveurs bénéficiaires de ces autorisations. Les
            établissements publics, collectivités ou encore le grand public y trouveront également des informations utiles
            à la compréhension et la mise en œuvre d’une gestion globale et concertée de la ressource en eau, telle que
            prévue par le Schéma directeur d’aménagement et de gestion des eaux (SDAGE) de La Réunion.
          </Typography>

          <Typography variant='body1'>
            Basé sur une cartographie qui se veut exhaustive, l’outil décrit les <b>modalités d’exploitation des points de
              prélèvement</b> en activité ou passés (bénéficiaires, autorisations délivrées, volumes autorisés et valeurs
            seuils à respecter…) et valorise les <b>données de suivi collectées en continu</b>.
          </Typography>

          <Typography variant='body1'>
            Identifié par le SDAGE 2022-2027, le projet « Partageons l’Eau » est porté par la DEAL de La Réunion
            depuis 2022, en lien étroit avec ses partenaires locaux (ARS, Office de l’eau, BRGM). Il s’appuie sur un travail
            de longue haleine de structuration des données. Depuis 2023, il bénéficie de l’appui financier de la{' '}
            <a href='https://beta.gouv.fr/incubateurs/mtes.html'>Fabrique numérique</a>, l’incubateur de « startups d’Etat »
            du ministère en charge de l’écologie.
          </Typography>
        </Box>
      </SidedSection>
    </>
  )
}

export default Home
