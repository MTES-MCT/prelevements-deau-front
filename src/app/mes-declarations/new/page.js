import {fr} from '@codegouvfr/react-dsfr'
import {Box, Typography} from '@mui/material'

import DeclarationTemplateDownload from '@/components/declarations/declaration-template-download.js'
import NewDeclarationEntry from '@/components/declarations/new-declaration-entry.js'
import {getAllowedDeclarationTypesAction} from '@/server/actions/declarations.js'

export const metadata = {
  title: 'Nouvelle déclaration'
}

export const dynamic = 'force-dynamic'

const TEMPLATE_DECLARATION_TYPE_CODE = 'template-file'

const NouvelleDeclarationPage = async () => {
  const result = await getAllowedDeclarationTypesAction()
  const response = result?.success ? result.data : null
  const allowedDeclarationTypes = response?.data ?? []
  const meta = response?.meta ?? {}
  const hasTemplateDeclarationType = allowedDeclarationTypes.some(
    declarationType => declarationType.code === TEMPLATE_DECLARATION_TYPE_CODE
  )

  return (
    <>
      <div className='fr-container flex flex-col my-3 gap-4'>
        <Typography variant='h4'>
          Nouvelle déclaration de prélèvements
        </Typography>
        <NewDeclarationEntry
          allowedDeclarationTypes={allowedDeclarationTypes}
          availablePreleveurs={meta.preleveurs ?? []}
          declarantRole={meta.declarantRole}
          quickDeclarationEnabled={meta.quickDeclarationEnabled}
          canCreateQuickDeclaration={meta.canCreateQuickDeclaration}
        />
      </div>

      {hasTemplateDeclarationType && (
        <Box
          className='flex flex-wrap justify-between gap-4'
          sx={{
            pt: 3,
            pb: 2,
            backgroundColor: fr.colors.decisions.background.alt.blueFrance.default
          }}
        >
          <div className='fr-container'>
            <h3 className='fr-h5'>
              Besoin du modèle type pour un dépôt de fichier ?
            </h3>
            <DeclarationTemplateDownload />
          </div>
        </Box>
      )}
    </>
  )
}

export default NouvelleDeclarationPage
