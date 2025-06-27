import {
  Alert, Box, Chip, Typography
} from '@mui/material'
import Link from 'next/link'
import {notFound} from 'next/navigation'

import {getPreleveur, getPointsFromPreleveur} from '@/app/api/points-prelevement.js'
import {getUsagesColors} from '@/components/map/legend-colors.js'
import LabelValue from '@/components/ui/label-value.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Page = async ({params}) => {
  const {id} = await params

  const preleveur = await getPreleveur(id)
  if (!preleveur) {
    notFound()
  }

  const points = await getPointsFromPreleveur(id)

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-5'>
        <Typography variant='h4' className='fr-mt-3w'>
          {preleveur.civilite} {preleveur.nom} {preleveur.prenom} {preleveur.sigle} {preleveur.raison_sociale}
          <p className='italic'>
            {preleveur.exploitations && preleveur.exploitations.length > 0 ? (
              `${preleveur.exploitations.length} ${preleveur.exploitations.length === 1 ? 'exploitation' : 'exploitations'}`
            ) : (
              <Alert severity='info'>Aucune exploitation</Alert>
            )}
          </p>
        </Typography>
        <div className='italic'>
          <LabelValue label='Usages'>
            {preleveur.usages && preleveur.usages.length > 0 ? (

              preleveur.usages.map(u => (
                <Chip
                  key={`${u}`}
                  label={u}
                  sx={{
                    ml: 1,
                    backgroundColor: getUsagesColors(u)?.color,
                    color: getUsagesColors(u)?.textColor
                  }}
                />
              ))
            ) : (
              <Alert severity='info'>Aucun usage</Alert>
            )}
          </LabelValue>
        </div>
        <div><b>Points de prélevement : </b>
          {points && points.length > 0 ? (
            points.map(point => (
              <div key={point.id_point}>
                <Link href={`/prelevements/${point.id_point}`}>
                  {point.id_point} - {point.nom}
                </Link>
              </div>
            ))
          ) : (
            <Alert severity='info' className='mt-4'>
              Aucun point de prélevement
            </Alert>
          )}
        </div>
      </Box>
    </>
  )
}

export default Page
