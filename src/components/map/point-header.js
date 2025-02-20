import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Typography
} from '@mui/material'

const PointHeader = ({point, onClose}) => (
  <div className='flex w-full md:items-center justify-between gap-2'>
    <Typography variant='h6' className='!m-0'>
      {point.nom || 'Pas de nom renseigné'}
    </Typography>
    <Button
      className='min-w-[40px]'
      iconId='fr-icon-close-line'
      title='Fermer'
      onClick={onClose}
    />
  </div>
)

export default PointHeader
