import Button from '@codegouvfr/react-dsfr/Button'
import {
  List, ListItem, Chip,
  Typography
} from '@mui/material'
import Link from 'next/link'
import {signOut} from 'next-auth/react'

const LoginHeaderItem = ({user}) => (
  <List className='flex items-center'>
    {user ? (
      <ListItem>
        {user.prenom || user.nom ? (
          <>
            <Button
              aria-expanded='false'
              aria-controls='collapse-menu-01'
              type='menu'
              priority='tertiary no outline'
              className='gap-1'
            >
              <span className='fr-icon-account-circle-fill fr-icon--sm' />
              {user.prenom} {user.nom}
            </Button>

            <div className='fr-collapse fr-menu' id='collapse-menu-01'>
              <List className='fr-menu__list w-fit'>
                <ListItem
                  className='cursor-pointer gap-1 whitespace-nowrap'
                  onClick={() => signOut({callbackUrl: '/login', redirect: true})}
                >
                  <span className='fr-icon-logout-box-r-line fr-icon--sm' aria-hidden='true' />
                  <Typography className='fr-text--sm'>Se déconnecter</Typography>
                </ListItem>
              </List>
            </div>
          </>
        ) : (
          <Button
            iconId='fr-icon-logout-box-r-line'
            className='fr-text--sm fr-m-0'
            priority='tertiary no outline'
            onClick={() => signOut({callbackUrl: '/login', redirect: true})}
          >
            Se déconnecter
          </Button>
        )}
      </ListItem>
    ) : (
      <ListItem>
        <Link href='/login' className='fr-btn fr-mb-0 gap-1 flex items-center'>
          <Typography className='fr-icon-account-circle-fill fr-icon--sm' aria-hidden='true' />
          Se connecter
        </Link>
      </ListItem>
    )}

    {user?.role && (
      <Chip
        label={user.role}
        sx={{
          textTransform: 'capitalize',
          backgroundColor: 'var(--artwork-decorative-blue-france)',
          color: 'var(--text-default-grey)'
        }}
      />
    )}
  </List>
)

export default LoginHeaderItem
