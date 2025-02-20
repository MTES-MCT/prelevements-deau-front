import {fr} from '@codegouvfr/react-dsfr'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Drawer, useMediaQuery, Box, useTheme
} from '@mui/material'

const SidePanel = ({header, isOpen, panelContent, handleOpen, children}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <div className='w-full h-full relative flex-1 min-h-0'>
      {isMobile ? (
        // --------------------------------
        // Mode mobile
        // --------------------------------
        <div className='relative flex flex-col w-full h-full'>
          {/* Contenu principal */}
          <div className='flex-1 overflow-auto'>
            {children}
          </div>

          <Drawer
            variant='permanent'
            anchor='bottom'
            className='min-h-14'
            PaperProps={{
              sx: {
                maxHeight: '66%'
              }
            }}
          >
            <Box
              className='sticky top-0 z-20 px-4 py-2 flex justify-between gap-4 shadow'
              sx={{
                background: fr.colors.decisions.background.default.grey.default
              }}
            >
              {header}
              <Button
                className='min-w-[40px]'
                iconId={isOpen ? 'fr-icon-arrow-down-s-line' : 'fr-icon-arrow-up-s-line'}
                title={isOpen ? 'Fermer' : 'Ouvrir'}
                onClick={() => handleOpen(!isOpen)}
              />
            </Box>

            {isOpen && (
              <div className='flex-1 overflow-auto'>
                {panelContent}
              </div>
            )}
          </Drawer>
        </div>
      ) : (
        // --------------------------------
        // Mode desktop / tablette
        // --------------------------------
        <div className='flex w-full h-full absolute'>
          <aside className='flex-shrink-0 min-w-[300px] max-w-[600px] basis-1/3 overflow-auto shadow-lg z-10'>
            <Box
              className='sticky top-0 z-20 p-4 shadow-md'
              sx={{
                background: fr.colors.decisions.background.default.grey.default
              }}
            >
              {header}
            </Box>
            {panelContent}
          </aside>

          <div className='flex-1 overflow-auto flex flex-col'>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export default SidePanel
