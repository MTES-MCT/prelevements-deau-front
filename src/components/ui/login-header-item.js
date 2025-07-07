import Button from '@codegouvfr/react-dsfr/Button'
import {
  List, ListItem, Chip,
  Typography
} from '@mui/material'
import Link from 'next/link'
import {signOut} from 'next-auth/react'

const LoginHeaderItem = ({user}) => (
  <List sx={{display: 'flex', alignItems: 'center'}}>
    {user ? (
      <ListItem>
        {user.prenom || user.nom ? (
          <>
            <Button
              aria-expanded='false'
              aria-controls='collapse-menu-01'
              type='menu'
              className='fr-nav__btn fr-mb-0 gap-1'
            >
              {user.prenom || user.nom ? (
                <>
                  <span className='fr-icon-account-circle-fill fr-icon--sm' />
                  {user.prenom} {user.nom}
                </>
              ) : (
                <>
                  <span className='fr-icon-logout-box-r-line fr-icon--sm' aria-hidden='true' />
                  <Typography className='fr-text--sm'>Se déconnecter</Typography>
                </>
              )}
            </Button>

            <div className='fr-collapse fr-menu' id='collapse-menu-01'>
              <List className='fr-menu__list' sx={{
                width: 'fit-content'
              }}
              >
                <ListItem
                  sx={{
                    cursor: 'pointer',
                    gap: 1,
                    whiteSpace: 'nowrap'
                  }}
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
            className='fr-text--sm'
            onClick={() => signOut({callbackUrl: '/login', redirect: true})}
          >
            Se déconnecter
          </Button>
        )}

      </ListItem>
    ) : (
      <ListItem>
        <Link href='/login' className='fr-btn fr-mb-0 gap-1'>
          <Typography className='fr-icon-account-circle-fill fr-icon--sm' aria-hidden='true' />
          Se connecter
        </Link>
      </ListItem>
    )}

    {user?.isAdmin && <Chip label='Instructeur' />}
  </List>
)

export default LoginHeaderItem
