import {HeaderQuickAccessItem} from '@codegouvfr/react-dsfr/Header'
import {signOut} from 'next-auth/react'

const LoginHeaderItem = ({id, user}) => (
  <HeaderQuickAccessItem
    id={id}
    quickAccessItem={
      user ? {
        iconId: 'fr-icon-logout-box-r-line',
        text: 'Se déconnecter',
        buttonProps: {
          onClick() {
            signOut({
              callbackUrl: '/login',
              redirect: true
            })
          }
        }
      } : {
        iconId: 'fr-icon-account-circle-line',
        text: 'Se connecter',
        linkProps: {
          href: '/login'
        }
      }
    }
  />
)

export default LoginHeaderItem
