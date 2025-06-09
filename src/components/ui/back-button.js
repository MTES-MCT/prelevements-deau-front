import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Link from 'next/link'

const BackButton = ({label, href}) => (
  <div className='flex gap-2 mt-2'>
    <ArrowBackIcon />
    <Link href={href}>
      {label || 'Retour'}
    </Link>
  </div>
)

export default BackButton
