import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Box, Chip, Typography
} from '@mui/material'
import {notFound} from 'next/navigation'

import {
  getPreleveur,
  getExploitationFromPreleveur,
  getDocumentsFromPreleveur,
  getPointPrelevement
} from '@/app/api/points-prelevement.js'
import DocumentsList from '@/components/documents/documents-list.js'
import ExploitationsList from '@/components/exploitations/exploitations-list.js'
import {getUsagesColors} from '@/components/map/legend-colors.js'
import LabelValue from '@/components/ui/LabelValue/index.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Page = async ({params}) => {
  const {id} = await params

  const preleveur = await getPreleveur(id)

  if (!preleveur) {
    notFound()
  }

  const documents = await getDocumentsFromPreleveur(id)
  const exploitations = await getExploitationFromPreleveur(id)

  const exploitationsWithPoints = await Promise.all(exploitations.map(async exploitation => {
    const point = await getPointPrelevement(exploitation.point)

    return {...exploitation, point}
  }))

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
        <div className='italic'>
          <LabelValue label='Usages'>
            {preleveur.usages && preleveur.usages.length > 0 ? (
              preleveur.usages.map(u => (
                <Chip
                  key={u}
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

        <div className='flex justify-between'>
          <Typography variant='h6' className='fr-mt-1w'>
            Documents :
          </Typography>
          <Button
            size='small'
            priority='secondary'
            linkProps={{
              href: `/preleveurs/${id}/documents`
            }}
          >
            Gestion des documents
          </Button>
        </div>
        {documents?.length > 0 ? (
          <DocumentsList
            documents={documents}
          />
        ) : (
          <p><i>Pas de documents</i></p>
        )}

        {preleveur.exploitations && preleveur.exploitations.length > 0 ? (
          <ExploitationsList exploitations={exploitationsWithPoints} />
        ) : (
          <Alert severity='info' description='Aucune exploitation' />
        )}
      </Box>
    </>
  )
}

export default Page
