import {CircularProgress} from '@mui/material'

const PageLoading = ({message = 'Chargement de la page...'}) => (
  <div
    aria-busy='true'
    aria-live='polite'
    className='flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 px-4 py-12 text-center'
    role='status'
  >
    <CircularProgress aria-hidden size={28} />
    <p className='fr-text--sm fr-mb-0 text-gray-700'>{message}</p>
  </div>
)

export default PageLoading
