import {fr} from '@codegouvfr/react-dsfr'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Box, Chip, List, Typography, ListItem
} from '@mui/material'
import {notFound} from 'next/navigation'

import {getPreleveur} from '@/app/api/points-prelevement.js'
import {getUsagesColors} from '@/components/map/legend-colors.js'
import ExploitationsSection from '@/components/preleveurs/exploitations-section.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const ContactItem = ({children, icon}) => (
  <ListItem sx={{display: 'flex', alignItems: 'flex-end'}}>
    <span
      className={`mr-1 ${icon} fr-text--sm m-0`}
      aria-hidden='true'
      style={{color: fr.colors.decisions.text.label.blueFrance.default}}
    />
    {children ? (
      <div>{children}</div>
    ) : (
      <Typography fontWeight='light' fontStyle='italic' className='fr-text--sm'>Donné non communiquée</Typography>
    )}
  </ListItem>
)

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
          <Box sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
            <span
              className={`${preleveur.raison_sociale ? 'fr-icon-building-fill' : 'fr-icon-account-circle-fill'}`}
              style={{color: fr.colors.decisions.text.label.blueFrance.default}}
            />
            <Typography variant='h5'>
              {preleveur.civilite} {preleveur.nom} {preleveur.prenom} {preleveur.sigle} {preleveur.raison_sociale}
            </Typography>
          </Box>

          <Button
            priority='secondary'
            iconId='fr-icon-edit-line'
            linkProps={{
              href: `/preleveurs/${preleveur.id_preleveur}/edit`
            }}
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

        {(preleveur.email || preleveur.numero_telephone || preleveur.adresse_1) && (
          <List sx={{border: `1px solid ${fr.colors.decisions.border.default.grey.default}`, padding: 2}}>
            <ContactItem icon='ri-at-line'>{preleveur.email}</ContactItem>
            <ContactItem icon='fr-icon-phone-line' >{preleveur.numero_telephone}</ContactItem>
            <ContactItem icon='fr-icon-home-4-line'>
              {preleveur.adresse_1 && (
                <Typography className='fr-text--sm'>{`${preleveur.adresse_1 || ''} ${preleveur.adresse_2 || ''} ${preleveur.code_postal || ''} ${preleveur.commune || ''}`}</Typography>
              )}
            </ContactItem>
          </List>
        )}

        <ExploitationsSection exploitations={preleveur.exploitations} />
      </Box>
    </>
  )
}

export default Page
