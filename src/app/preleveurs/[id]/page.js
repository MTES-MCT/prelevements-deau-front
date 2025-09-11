import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Box, Chip, Typography
} from '@mui/material'
import Link from 'next/link'
import {notFound} from 'next/navigation'

import {getPreleveur, getPointsFromPreleveur} from '@/app/api/points-prelevement.js'
import {getUsagesColors} from '@/components/map/legend-colors.js'
import LabelValue from '@/components/ui/label-value.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getPointPrelevementURL} from '@/lib/urls.js'

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
          <div className='flex justify-between pb-2'>
            {preleveur.civilite} {preleveur.nom} {preleveur.prenom} {preleveur.sigle} {preleveur.raison_sociale}
            <div>
              <Button
                priority='secondary'
                iconId='fr-icon-edit-line'
                linkProps={{
                  href: `/preleveurs/${preleveur.id_preleveur}/edit`
                }}
              >
                Éditer
              </Button>
            </div>
          </div>
        </Typography>
        {preleveur.exploitations && preleveur.exploitations.length > 0 ? (
          <div>
            <span className='italic font-bold'>
              {`${preleveur.exploitations.length} ${
                preleveur.exploitations.length === 1
                  ? 'exploitation : '
                  : 'exploitations : '}`}
            </span>
            <span>
              {preleveur.exploitations.map((exploitation, idx) => (
                <span key={exploitation.id_exploitation}>
                  <Link href={`/exploitations/${exploitation.id_exploitation}`}>
                    {exploitation.id_exploitation}
                  </Link>
                  {idx < preleveur.exploitations.length - 1 && ', '}
                </span>
              ))}
            </span>
          </div>
        ) : (
          <Alert severity='info' description='Aucune exploitation' />
        )}
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
              <Alert severity='info' description='Aucun usage' />
            )}
          </LabelValue>
        </div>
        <div><b>Points de prélevement : </b>
          {points && points.length > 0 ? (
            points.map(point => (
              <div key={point._id}>
                <Link href={getPointPrelevementURL(point)}>
                  {point.id_point} - {point.nom}
                </Link>
              </div>
            ))
          ) : (
            <Alert
              severity='info'
              className='mt-4'
              description='Aucun point de prélevement'
            />
          )}
        </div>
      </Box>
    </>
  )
}

export default Page
