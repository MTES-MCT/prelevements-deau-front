import {fr} from '@codegouvfr/react-dsfr'
import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb.js'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Box, Chip, List, Typography
} from '@mui/material'
import {notFound} from 'next/navigation'

import {getPreleveur} from '@/app/api/points-prelevement.js'
import ExploitationsSection from '@/components/exploitations/exploitations-section.js'
import {getUsagesColors} from '@/components/map/legend-colors.js'
import LabelWithIcon from '@/components/ui/label-with-icon.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getPreleveurEditURL} from '@/lib/urls.js'

const Page = async ({params}) => {
  const {id} = await params

  const preleveur = await getPreleveur(id)
  if (!preleveur) {
    notFound()
  }

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-5 mt-5'>
        <Box sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}
        >
          <Box>
            <Breadcrumb
              currentPageLabel={preleveur?.raison_sociale || `${preleveur?.nom || ''} ${preleveur?.prenom || ''}`.trim()}
              homeLinkProps={{href: '/'}}
              segments={[{
                label: 'Préleveurs',
                linkProps: {href: '/preleveurs'}
              }]}
            />
            <Box sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
              <span
                className={`${preleveur.raison_sociale ? 'fr-icon-building-fill' : 'fr-icon-account-circle-fill'}`}
                style={{color: fr.colors.decisions.text.label.blueFrance.default}}
              />
              <Typography variant='h5'>
                {preleveur.civilite} {preleveur.nom} {preleveur.prenom} {preleveur.sigle} {preleveur.raison_sociale}
              </Typography>
            </Box>
          </Box>

          <Button
            priority='secondary'
            iconId='fr-icon-edit-line'
            linkProps={{href: getPreleveurEditURL(preleveur.id_preleveur)}}
          >
            Éditer
          </Button>
        </Box>
        <Box sx={{
          display: 'flex', gap: 1, justifyContent: 'space-between', background: fr.colors.options.grey._975_100.default, padding: 2
        }}
        >
          <Box sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
            <Typography fontWeight='bold'>Nombre d’exploitations : </Typography>
            <Typography fontWeight='light'>{`${preleveur.exploitations && preleveur.exploitations.length > 0 ? preleveur.exploitations.length : 'Aucune exploitation'}`}</Typography>
          </Box>

          <Box sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
            <Typography fontWeight='bold'>Usages : </Typography>
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
              <Typography fontWeight='light'>Aucun usage</Typography>
            )}
          </Box>
        </Box>

        <List className='border border-[var(--border-default-grey)] !p-4 flex flex-col gap-2'>
          <LabelWithIcon icon='ri-at-line'>{preleveur.email}</LabelWithIcon>
          <LabelWithIcon icon='fr-icon-phone-line'>{preleveur.numero_telephone}</LabelWithIcon>
          <LabelWithIcon icon='fr-icon-home-4-line'>
            {preleveur.adresse_1 && (
              `${preleveur.adresse_1 || ''} ${preleveur.adresse_2 || ''} ${preleveur.code_postal || ''} ${preleveur.commune || ''}`
            )}
          </LabelWithIcon>
        </List>

        <ExploitationsSection exploitations={preleveur.exploitations} />
      </Box>
    </>
  )
}

export default Page
