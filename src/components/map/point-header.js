import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Typography
} from '@mui/material'

const PointHeader = ({point, onClose}) => (
  <div className='flex flex-1 items-center justify-between gap-2'>
    <Typography variant='h6' className='!m-0'>
      {point.nom || 'Pas de nom renseigné'}
    </Typography>
    <Button
      iconId='fr-icon-close-line'
      title='Fermer'
      onClick={onClose}
    />
  </div>
)

export default PointHeader
