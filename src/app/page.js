import {Box, Typography} from '@mui/material'
import Image from 'next/image'
import Link from 'next/link'

import Counter from '@/components/ui/Counter/index.js'
import SidedSection from '@/components/ui/SidedSection/index.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarationURL, getPointsPrelevementURL} from '@/lib/urls.js'

const activePointsReunion = 363
const activePointsBlv = 811
const activePointsTotal = activePointsReunion + activePointsBlv

const sectionContainerSx = {
  width: '100%',
  maxWidth: 1200,
  mx: 'auto',
  px: {xs: 2, md: 3}
}

const cardSx = {
  border: '1px solid var(--border-default-grey)',
  backgroundColor: 'var(--background-default-grey)',
  p: 3,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 1.5
}

const territoryCardSx = {
  border: '1px solid var(--border-default-grey)',
  backgroundColor: 'var(--background-default-grey)',
  p: 2,
  display: 'flex',
  alignItems: 'center',
  gap: 1.5
}

const SectionHeader = ({eyebrow, title, subtitle}) => (
  <Box className='flex flex-col gap-2' sx={{mb: 4}}>
    <Typography
      component='p'
      sx={{
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-action-high-blue-france)'
      }}
    >
      {eyebrow}
    </Typography>

    <Typography variant='h2'>{title}</Typography>

    {subtitle && (
      <Typography variant='body1' sx={{maxWidth: 760}}>
        {subtitle}
      </Typography>
    )}
  </Box>
)

const ValueCard = ({index, title, description, icon}) => (
  <Box sx={cardSx}>
    <Box className='flex items-center gap-3'>
      <Box
        sx={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-open-blue-france)',
          backgroundColor: 'var(--background-alt-blue-france)',
          fontSize: 20
        }}
        aria-hidden='true'
      >
        {icon}
      </Box>

      <Typography
        component='span'
        sx={{
          fontSize: 18,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-action-high-blue-france)'
        }}
      >
        {index}
      </Typography>
    </Box>

    <Typography variant='h6' className='fr-mt-1w fr-mb-2w'>{title}</Typography>

    <Typography variant='body2'>{description}</Typography>
  </Box>
)

const ServiceCard = ({title, subtitle, icon, tone = 'blue', features, visual}) => {
  const isGreen = tone === 'green'

  return (
    <Box
      sx={{
        border: '1px solid var(--border-default-grey)',
        overflow: 'hidden',
        height: '100%',
        backgroundColor: 'var(--background-default-grey)'
      }}
    >
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          color: 'var(--text-inverted-grey)',
          backgroundColor: isGreen
            ? 'var(--background-action-high-green-bourgeon)'
            : 'var(--background-action-high-blue-france)'
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.18)',
            fontSize: 20
          }}
          aria-hidden='true'
        >
          {icon}
        </Box>

        <Box>
          <Typography variant='h6' sx={{color: 'inherit'}}>
            {title}
          </Typography>
          <Typography variant='body2' sx={{color: 'rgba(255,255,255,0.85)'}}>
            {subtitle}
          </Typography>
        </Box>
      </Box>

      <Box sx={{p: 3}} className='flex flex-col gap-2'>
        {features.map(feature => (
          <Box
            key={feature}
            sx={{
              py: 1.25,
              borderBottom: '1px solid var(--border-default-grey)',
              '&:last-child': {borderBottom: 'none'}
            }}
            className='flex gap-2'
          >
            <Typography
              component='span'
              sx={{
                fontWeight: 700,
                color: isGreen
                  ? 'var(--text-default-success)'
                  : 'var(--text-action-high-blue-france)'
              }}
            >
              →
            </Typography>
            <Typography variant='body2'>{feature}</Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          px: 3,
          pb: 3
        }}
      >
        {visual}
      </Box>
    </Box>
  )
}

const TerritoryRow = ({status, label}) => {
  const isActive = status === 'Actif'

  return (
    <Box sx={territoryCardSx}>
      <Box
        sx={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          px: 1,
          py: 0.5,
          backgroundColor: isActive
            ? 'var(--background-contrast-success)'
            : 'var(--background-contrast-grey)',
          color: isActive
            ? 'var(--text-default-success)'
            : 'var(--text-mention-grey)'
        }}
      >
        {status}
      </Box>

      <Typography variant='body2'>{label}</Typography>
    </Box>
  )
}

const TerritoryCaseCard = ({title, tag, description, meta, href, imageSrc, imageAlt}) => (
  <Link
    href={href}
    style={{
      textDecoration: 'none',
      color: 'inherit',
      display: 'block',
      height: '100%'
    }}
  >
    <Box
      sx={{
        border: '1px solid var(--border-default-grey)',
        height: '100%',
        backgroundColor: 'var(--background-default-grey)',
        overflow: 'hidden',
        transition: 'background-color 0.15s ease',
        '&:hover': {
          backgroundColor: 'var(--background-alt-grey)'
        }
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: 180,
          backgroundColor: 'var(--background-alt-blue-france)'
        }}
      >
        <Image
          fill
          src={imageSrc}
          alt={imageAlt}
          style={{objectFit: 'cover'}}
          sizes='(max-width: 768px) 100vw, 50vw'
        />
      </Box>

      <Box className='flex flex-col gap-2' sx={{p: 3}}>
        <Typography
          component='span'
          sx={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-action-high-blue-france)'
          }}
        >
          {tag}
        </Typography>

        <Typography variant='h6'>{title}</Typography>

        <Typography variant='body2'>{description}</Typography>

        <Box className='flex flex-wrap gap-3' sx={{mt: 1}}>
          {meta.map(item => (
            <Typography
              key={item}
              variant='caption'
              sx={{color: 'var(--text-mention-grey)'}}
            >
              {item}
            </Typography>
          ))}
        </Box>

        <Typography
          variant='body2'
          sx={{
            mt: 1,
            fontWeight: 500,
            color: 'var(--text-action-high-blue-france)'
          }}
        >
          Découvrir ce cas d’usage →
        </Typography>
      </Box>
    </Box>
  </Link>
)

const Home = () => (
  <>
    <StartDsfrOnHydration />

    <SidedSection
      background='secondary'
      firstContent={
        <Box className='flex flex-col gap-6'>
          <Typography variant='h1' className='fr-my-2w'>
            <Box component='span'>Faciliter une meilleure </Box>
            <Box
              component='span'
              sx={{color: 'var(--text-label-blue-france)'}}
            >
              gestion collective
            </Box>
            <Box component='span'> de l’eau</Box>
          </Typography>
        </Box>
      }
      secondContent={
        <Box className='flex flex-col gap-6'>

          <Typography variant='body1' sx={{maxWidth: 520}}>
            Les tensions liées à la gestion quantitative de l’eau s’intensifient.
            Pour éviter une polarisation croissante des conflits, il est indispensable d’embarquer l’ensemble des
            acteurs dans une démarche collective de gestion de la ressource, fondée sur une meilleure transparence
            des prélèvements et de l’état des ressources.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              borderLeft: '4px solid var(--border-action-high-blue-france)',
              backgroundColor: 'var(--background-default-grey)',
              p: 3
            }}
          >
            <Box
              aria-hidden
              sx={{
                fontSize: 20,
                lineHeight: 1,
                mt: '2px'
              }}
            >
              🔒
            </Box>

            <Typography variant='body2'>
              <b>Accès aux données selon votre profil.</b> La donnée accessible dépend
              de votre rôle et de votre zone géographique. Les données individuelles des
              préleveurs ne sont accessibles qu’aux autorités compétentes sur le périmètre concerné.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              flexWrap: 'wrap'
            }}
          >
            <Link href={getPointsPrelevementURL()} className='fr-btn'>
              Accéder à la carte des points de prélèvement
            </Link>

            <Link
              href={getDeclarationURL()}
              className='fr-link fr-icon-arrow-right-line fr-link--icon-right'
            >
              Déclarer mes prélèvements
            </Link>
          </Box>

        </Box>
      }
    />

    <Box
      component='section'
      sx={{
        borderTop: '1px solid var(--border-default-grey)',
        borderBottom: '1px solid var(--border-default-grey)',
        py: 3
      }}
    >
      <Box sx={sectionContainerSx} className='flex flex-col md:flex-row md:items-center gap-4 md:gap-8'>
        <Typography
          component='p'
          sx={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-mention-grey)',
            minWidth: 100
          }}
        >
          Contexte
        </Typography>

        <Typography variant='body2' sx={{flex: 1}}>
          En 2022, <b>86 %</b> du territoire français a connu des restrictions sécheresse.
          D’ici 2050, si rien ne change, <b>88 %</b> du territoire pourrait être en tension modérée à sévère sur les prélèvements d’eau en été. <em>La crise de 2022 deviendrait la norme.</em>
        </Typography>

        <a
          href='https://www.strategie-plan.gouv.fr/files/files/Publications/2025/2025-01-21%20-%20Eau/FS-2025-Rapport-EAU-21mai.pdf'
          target='_blank'
          rel='noopener noreferrer'
          className='fr-link fr-icon-external-link-line fr-link--icon-right'
        >
          Rapport France Stratégie 2025
        </a>
      </Box>
    </Box>

    <Box component='section' sx={{backgroundColor: 'var(--background-alt-blue-france)', py: {xs: 6, md: 8}}}>
      <Box sx={sectionContainerSx}>
        <SectionHeader
          eyebrow='Ce que nous proposons'
          title='Une plateforme au service de tous les acteurs de l’eau'
          subtitle='Partageons l’eau structure la gestion quantitative de l’eau autour de trois fonctions complémentaires.'
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {xs: '1fr', md: 'repeat(3, 1fr)'},
            gap: 3
          }}
        >
          <ValueCard
            index='01'
            icon='📋'
            title='Déclarer & collecter'
            description='Une plateforme accessible à tous les acteurs de l’eau pour déclarer et collecter les prélèvements infra-annuels — de manière automatique et manuelle — ainsi que l’état des ressources par territoire (département, région, sous-bassin versant).'
          />

          <ValueCard
            index='02'
            icon='📊'
            title='Visualiser'
            description='Un service de visualisation pour comprendre les grands enjeux et les usages réels de l’eau sur le territoire. Cartes, graphiques et tableaux de bord accessibles à tous les niveaux de décision.'
          />

          <ValueCard
            index='03'
            icon='⚖️'
            title='Décider'
            description='Un service d’aide à la décision pour la mise en œuvre des SAGE et PTGE, fondé sur une donnée dynamique et partagée entre toutes les parties prenantes du territoire.'
          />
        </Box>

        <Box
          sx={{
            mt: 3,
            p: 2,
            borderLeft: '3px solid var(--border-default-success)',
            border: '1px solid var(--border-default-grey)',
            backgroundColor: 'var(--background-default-grey)'
          }}
        >
          <Typography variant='body2'>
            <b>À venir —</b> La plateforme intégrera également des outils dédiés à la concertation locale : supports pédagogiques, dispositifs de participation des usagers et outils de mobilisation.
          </Typography>
        </Box>
      </Box>
    </Box>

    <Box component='section' sx={{py: {xs: 6, md: 8}}}>
      <Box sx={sectionContainerSx}>
        <SectionHeader
          eyebrow='Des services adaptés'
          title='Un espace dédié à chaque acteur'
          subtitle='L’accès aux données et aux fonctionnalités est adapté à votre rôle et à votre périmètre d’intervention.'
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {xs: '1fr', md: 'repeat(2, 1fr)'},
            gap: 3
          }}
        >
          <ServiceCard
            title='Espace Administration'
            subtitle='DDT · DREAL · Porteurs de SAGE/PTGE'
            icon='🏛️'
            features={[
              'Accès aux données individuelles des préleveurs de son périmètre',
              'Relance des préleveurs en retard de déclaration',
              'Visualisation de l’état des ressources en eau par territoire',
              'Suivi des volumes prélevés par masse d’eau et par catégorie d’usage'
            ]}
            visual={
              <Box
                sx={{
                  p: 2,
                  border: '1px solid var(--border-default-grey)',
                  backgroundColor: 'var(--background-alt-blue-france)'
                }}
              >
                <Counter label='Points actifs' number={activePointsTotal} />
              </Box>
            }
          />

          <ServiceCard
            title='Espace Préleveur'
            subtitle='Agriculteurs · Industriels · Collectivités'
            icon='🌾'
            tone='green'
            features={[
              'Dépôt de déclaration infra-annuelle de prélèvements',
              'Échanges sécurisés avec l’administration compétente',
              'Visualisation des volumes prélevés par masse d’eau et grande catégorie d’usager sur son territoire',
              'Suivi de l’évolution de la ressource sur son périmètre (ex : SAGE)'
            ]}
            visual={
              <Box
                sx={{
                  p: 2,
                  border: '1px solid var(--border-default-grey)',
                  backgroundColor: 'var(--background-alt-green-tilleul-verveine)'
                }}
              >
                <Typography variant='body2'>
                  Suivi simplifié des volumes, des périodes déclarées et des indicateurs utiles
                  sur le territoire concerné.
                </Typography>
              </Box>
            }
          />
        </Box>
      </Box>
    </Box>

    <Box component='section' sx={{backgroundColor: 'var(--background-alt-blue-france)', py: {xs: 6, md: 8}}}>
      <Box
        sx={{
          ...sectionContainerSx,
          display: 'grid',
          gridTemplateColumns: {xs: '1fr', lg: '1fr 360px'},
          gap: 4
        }}
      >
        <Box>
          <SectionHeader
            eyebrow='Déploiement'
            title='Les territoires accompagnés'
            subtitle='Partageons l’Eau est déployé sur 2 territoires pilotes. D’ici 2026, 4 à 5 nouveaux territoires rejoindront la plateforme.'
          />

          <Box
            sx={{
              border: '1px solid var(--border-default-grey)',
              backgroundColor: 'var(--background-default-grey)',
              p: 2
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: {xs: 240, md: 360}
              }}
            >
              <Image
                fill
                src='/images/points-prelevements-france.jpg'
                alt='Carte des territoires accompagnés par Partageons l’eau'
                style={{objectFit: 'cover'}}
                sizes='(max-width: 1200px) 100vw, 60vw'
              />
            </Box>
          </Box>

          <Box className='flex flex-col gap-2' sx={{mt: 2}}>
            <TerritoryRow status='Actif' label='La Réunion — depuis 2022' />
            <TerritoryRow status='Actif' label='SAGE Bièvre Liers Valloire (Isère / Drôme)' />
            <TerritoryRow status='2026' label='4 à 5 nouveaux territoires en cours d’intégration' />
          </Box>
        </Box>

        <Box
          sx={{
            border: '1px solid var(--border-default-grey)',
            backgroundColor: 'var(--background-default-grey)',
            p: 3,
            alignSelf: 'start'
          }}
          className='flex flex-col gap-3'
        >
          <Typography variant='h5'>Le service vous intéresse ?</Typography>

          <Typography variant='body2'>
            Partageons l’eau s’adresse aux territoires souhaitant structurer la gestion quantitative de l’eau sur leur périmètre — bassin versant, département ou région.
          </Typography>

          <Typography variant='body2'>
            Nous accompagnons les porteurs de SAGE, PTGE et les services de l’État dans la mise en place du service.
          </Typography>

          <a href='mailto:contact@partageonsleau.fr' className='fr-btn fr-btn--secondary'>
            Discutons-en
          </a>

          <Typography variant='caption' sx={{color: 'var(--text-mention-grey)'}}>
            Réponse sous 3 jours ouvrés.
          </Typography>
        </Box>
      </Box>
    </Box>

    <Box component='section' sx={{py: {xs: 6, md: 8}}}>
      <Box sx={sectionContainerSx}>
        <SectionHeader
          eyebrow='Retours d’expérience'
          title='Comment ça se passe sur le terrain'
          subtitle='Découvrez comment Partageons l’Eau a été déployé sur les deux premiers territoires pilotes.'
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {xs: '1fr', md: 'repeat(2, 1fr)'},
            gap: 3
          }}
        >
          <TerritoryCaseCard
            href={getPointsPrelevementURL()}
            imageSrc='/images/points-prelevements-reunion.jpg'
            imageAlt='Carte des points de prélèvement à La Réunion'
            tag='Territoire pilote · Océan Indien'
            title='La Réunion — premier territoire de déploiement'
            description='Porté par la DEAL de La Réunion depuis 2022, ce déploiement a structuré la collecte des prélèvements d’eau sur l’ensemble de l’île, tous usages confondus.'
            meta={['Depuis 2022', `${activePointsReunion} points en activité`]}
          />

          <TerritoryCaseCard
            href={getPointsPrelevementURL()}
            imageSrc='/images/points-prelevements-blv.jpg'
            imageAlt='Carte des points de prélèvement du SAGE Bièvre Liers Valloire'
            tag='Territoire pilote · Isère / Drôme'
            title='SAGE Bièvre Liers Valloire — gestion concertée en vallée'
            description='Le SAGE Bièvre Liers Valloire, à cheval sur l’Isère et la Drôme, constitue le premier déploiement de Partageons l’eau en métropole, sur un périmètre de bassin versant.'
            meta={['Déploiement en cours', 'Isère & Drôme']}
          />
        </Box>
      </Box>
    </Box>
  </>
)

export default Home
