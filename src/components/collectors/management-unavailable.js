import {Alert} from '@codegouvfr/react-dsfr/Alert'

export default function CollectorManagementUnavailable({result}) {
  if (!result || result.success) return null
  return <Alert className='my-4' severity='warning' small title='Vos autorisations de gestion ne peuvent pas être chargées.'
    description='Rechargez la page pour retrouver les actions de création et de modification.' />
}
