import {Button} from '@codegouvfr/react-dsfr/Button'
import {Drawer, useMediaQuery, useTheme} from '@mui/material'

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
            <div className='sticky top-0 z-20 bg-white px-4 py-2 flex items-center justify-between gap-4'>
              {header}
              <Button
                iconId={isOpen ? 'fr-icon-arrow-down-s-line' : 'fr-icon-arrow-up-s-line'}
                title={isOpen ? 'Fermer' : 'Ouvrir'}
                onClick={() => handleOpen(!isOpen)}
              />
            </div>

            {isOpen && (
              <div className='px-4 pb-4 flex-1 overflow-auto'>
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
            <div className='sticky top-0 z-20 bg-white p-4'>
              {header}
            </div>
            <div className='p-4'>
              {panelContent}
            </div>
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
