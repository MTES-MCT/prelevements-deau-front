'use client'

import Button from '@codegouvfr/react-dsfr/Button'
import {
  List, ListItem, Chip,
  Typography
} from '@mui/material'
import Link from 'next/link'
import {useRouter} from 'next/navigation'

import {useAuth} from '@/contexts/auth-context.js'

const ROLE_LABELS = {
  editor: 'Éditeur',
  reader: 'Lecteur'
}

const ROLE_COLORS = {
  editor: 'var(--artwork-decorative-blue-france)',
  reader: 'var(--artwork-decorative-purple-glycine)'
}

const LoginHeaderItem = () => {
  const {user, logout} = useAuth()
  const router = useRouter()

  const roleLabel = user?.role ? ROLE_LABELS[user.role] || user.role : null
  const roleColor = user?.role ? ROLE_COLORS[user.role] || 'var(--artwork-decorative-blue-france)' : null
  const territoireNom = user?.territoire?.nom || null

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <List className='flex items-center'>
      {user ? (
        <>
          <ListItem>
            {user.prenom || user.nom ? (
              <>
                <Button
                  aria-expanded='false'
                  aria-controls='collapse-menu-01'
                  iconId='fr-icon-account-circle-fill fr-icon--sm'
                  iconPosition='left'
                  type='menu'
                  priority='tertiary no outline'
                  className='gap-1 fr-m-0'
                >
                  {user.prenom} {user.nom}
                </Button>

                <div className='fr-collapse fr-menu' id='collapse-menu-01'>
                  <List className='fr-menu__list w-fit'>
                    {territoireNom && (
                      <ListItem className='whitespace-nowrap px-2'>
                        <Typography className='fr-text--sm text-gray-600'>
                          {territoireNom}
                        </Typography>
                      </ListItem>
                    )}
                    <ListItem
                      className='cursor-pointer gap-1 whitespace-nowrap'
                      onClick={handleLogout}
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
                onClick={handleLogout}
              >
                Se déconnecter
              </Button>
            )}
          </ListItem>

          {roleLabel && (
            <ListItem className='p-0'>
              <Chip
                label={roleLabel}
                size='small'
                sx={{
                  textTransform: 'capitalize',
                  backgroundColor: roleColor,
                  color: 'var(--text-default-grey)'
                }}
              />
            </ListItem>
          )}
        </>
      ) : (
        <ListItem>
          <Link href='/login' className='fr-btn fr-mb-0 gap-1 flex items-center'>
            <Typography className='fr-icon-account-circle-fill fr-icon--sm' aria-hidden='true' />
            Se connecter
          </Link>
        </ListItem>
      )}
    </List>
  )
}

export default LoginHeaderItem
