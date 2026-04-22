import {
  Box,
  Paper,
  Stack,
  Typography
} from '@mui/material'

import ExportForm from '@/components/export/export-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getPointsPrelevementAction, getPreleveursAction} from '@/server/actions/index.js'

export const dynamic = 'force-dynamic'

const fieldDescriptions = [
  {
    name: 'pointId',
    description: 'Identifiant unique du point de prélèvement.'
  },
  {
    name: 'pointNom',
    description: 'Nom du point de prélèvement.'
  },
  {
    name: 'parameter',
    description: 'Paramètre.'
  },
  {
    name: 'unit',
    description: 'Unité.'
  },
  {
    name: 'frequency',
    description: 'Pas de temps de la donnée dans l’export.'
  },
  {
    name: 'valueType',
    description:
      'Type de paramètre. Les valeurs de type cumulatif augmentent avec le temps (par exemple un volume prélevé, dont la valeur est plus importante lorsqu’elle est calculée sur une durée plus importante). À l’inverse, les valeurs de type instantané ne sont pas liées à la durée. Elles correspondent à une valeur mesurée par un instrument à un instant donné (par exemple une concentration ou une conductivité).'
  },
  {
    name: 'date',
    description: 'Date de la mesure.'
  },
  {
    name: 'time',
    description: 'Heure de la mesure.'
  },
  {
    name: 'dateHeure',
    description: 'Date et heure de la mesure.'
  },
  {
    name: 'value',
    description: 'Valeur du paramètre mesuré.'
  },
  {
    name: 'remark',
    description: 'Remarque.'
  },
  {
    name: 'originalValue',
    description:
      'Valeur originale du paramètre pour les volumes (valeurs cumulatives) acquis à un pas de temps moins fin que journalier. Par exemple, des données de volumes mensuels seront transformées en données de volumes journaliers moyens en prenant la moyenne sur le mois (originalValue / daysCovered). Cela permet de reconstituer des chroniques de volumes journaliers lorsque le pas de temps d’acquisition était moins précis.'
  },
  {
    name: 'originalDate',
    description:
      'Date de la valeur originale pour les volumes acquis à un pas de temps moins fin que journalier.'
  },
  {
    name: 'originalFrequency',
    description:
      'Pas de temps de la valeur originale pour les volumes acquis à un pas de temps moins fin que journalier.'
  },
  {
    name: 'daysCovered',
    description:
      'Durée entre deux acquisitions de données originales, utilisée pour reconstituer des valeurs moyennes journalières lorsque le pas de temps d’origine est supérieur à un jour.'
  }
]

const SectionCard = ({children, sx = {}}) => (
  <Paper
    elevation={0}
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 3,
      backgroundColor: 'background.paper',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
      ...sx
    }}
  >
    {children}
  </Paper>
)

const Page = async () => {
  const [pointsResult, preleveursResult] = await Promise.all([
    getPointsPrelevementAction(),
    getPreleveursAction()
  ])

  const points = pointsResult?.data || []
  const preleveurs = preleveursResult?.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full fr-py-4w'>
        <Stack spacing={4}>
          <SectionCard
            sx={{
              p: {xs: 3, md: 4},
              background:
                'linear-gradient(180deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0) 100%)'
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography variant='h4' sx={{fontWeight: 700}}>
                  Exports
                </Typography>
              </Box>

              <Typography
                variant='body1'
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.75
                }}
              >
                Téléchargez au format CSV l’ensemble des données validées
                disponibles sur la plateforme, avec leur structure et leur
                documentation.
              </Typography>

              <ExportForm
                points={points}
                preleveurs={preleveurs}
              />
            </Stack>
          </SectionCard>

          <SectionCard sx={{p: {xs: 3, md: 4}}}>
            <Stack spacing={4}>
              <Box>
                <Typography variant='h6' sx={{fontWeight: 700, mb: 2}}>
                  Documentation de l’export
                </Typography>

                <Stack spacing={2}>
                  <Typography
                    variant='body1'
                    sx={{lineHeight: 1.8, color: 'text.primary'}}
                  >
                    La fonction d’export disponible depuis cette page permet de
                    télécharger au format CSV l’ensemble des données
                    standardisées disponibles sur la plateforme, dès lors
                    qu’elles ont été validées par les instructeurs.
                  </Typography>

                  <Typography
                    variant='body1'
                    sx={{lineHeight: 1.8, color: 'text.primary'}}
                  >
                    Ces données concernent tous les paramètres fournis par les
                    préleveurs lors des déclarations mensuelles : volume
                    prélevé, débit prélevé, débit réservé, conductivité
                    électrique, niveau piézométrique, etc.
                  </Typography>

                  <Typography
                    variant='body1'
                    sx={{lineHeight: 1.8, color: 'text.primary'}}
                  >
                    Le pas de temps des données est celui des données d’origine
                    déclarées par les préleveurs, à l’exception des données de
                    volumes, converties en volumes journaliers moyens lorsque
                    les valeurs d’origine portent sur des durées supérieures à
                    un jour.
                  </Typography>

                  <Typography
                    variant='body1'
                    sx={{lineHeight: 1.8, color: 'text.primary'}}
                  >
                    Les données ne sont pas agrégées : ainsi, si deux
                    préleveurs prélèvent sur le même point de prélèvement
                    simultanément, deux lignes seront visibles dans l’export.
                    À ce stade, l’export ne précise pas l’identité des
                    préleveurs concernés.
                  </Typography>
                </Stack>
              </Box>

              <Box>
                <Typography variant='subtitle1' sx={{fontWeight: 700, mb: 2}}>
                  Champs présents dans le fichier CSV
                </Typography>

                <Stack spacing={2}>
                  {fieldDescriptions.map(field => (
                    <Box
                      key={field.name}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        backgroundColor: 'background.default'
                      }}
                    >
                      <Typography
                        variant='body1'
                        sx={{fontWeight: 700, mb: 0.5}}
                      >
                        {field.name}
                      </Typography>

                      <Typography
                        variant='body2'
                        sx={{color: 'text.secondary', lineHeight: 1.7}}
                      >
                        {field.description}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Typography variant='body2' color='text.secondary'>
                Dernière mise à jour de ce document : 22/04/2026
              </Typography>
            </Stack>
          </SectionCard>
        </Stack>
      </Box>
    </>
  )
}

export default Page
