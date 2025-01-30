import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Drawer,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'

const SidePanel = ({title, isOpen, panelContent, handleOpen, children}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <div className='w-full h-full relative flex-1 min-h-0'>
      {isMobile ? (
        // --------------------------------
        // Mode mobile
        // --------------------------------
        <div className='relative flex flex-col w-full h-full'>
          {/* La carte, qui occupe tout l'écran (sous le panneau) */}
          <div className='flex-1 overflow-auto'>
            {children}
          </div>

          {/*
            Drawer permanent (toujours visible en bas).
            On utilise un état isOpen pour changer la hauteur (tailwind).
          */}
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
            <div className='px-4 py-2 flex items-center justify-between gap-4'>
              <Typography variant='h6' className='!m-0'>
                {title}
              </Typography>

              <Button
                iconId={isOpen ? 'fr-icon-arrow-down-s-line' : 'fr-icon-arrow-up-s-line'}
                title={isOpen ? 'Fermer' : 'Ouvrir'}
                onClick={() => handleOpen(!isOpen)}
              />
            </div>

            {/*
                    Contenu (SidePanel, etc.)
                    => on ne l'affiche (ou on le rend visible) que si isOpen = true
                  */}
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
          {/* Panneau latéral (1/3, max 600px) avec ombrage */}
          <aside
            className='flex-shrink-0 min-w-[300px] max-w-[600px] basis-1/3 overflow-auto shadow-lg z-10'
          >
            <div className='p-4'>
              <Typography variant='h6'>
                {title}
              </Typography>
              {panelContent}
            </div>
          </aside>

          {/* Contenu principal (la carte) */}
          <div className='flex-1 overflow-auto flex flex-col'>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export default SidePanel
