'use client'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography, Box} from '@mui/material'
import Image from 'next/image'
import {useRouter} from 'next/navigation'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {parseHttpError} from '@/lib/http-error.js'

const Error = ({error}) => {
  const router = useRouter()

  const {statusCode, message} = parseHttpError(error)

  return (
    <>
      <StartDsfrOnHydration />

      <Box
        className='fr-container w-full gap-5'
        sx={{
          display: 'flex',
          flexDirection: {xs: 'column', md: 'row'},
          alignItems: {xs: 'center', md: 'flex-start'}
        }}
      >
        <Box className='fr-container w-full flex flex-col gap-5'>
          <Box className='fr-container w-full flex flex-col gap-2'>
            <Typography variant='h3' className='fr-mt-3w'>
              {message}
            </Typography>
            <p> Erreur {statusCode}</p>
          </Box>

          <Box className='fr-container w-full flex flex-col gap-2'>
            <Typography variant='h6'>
              Désolé, le service rencontre un problème&nbsp;: {message}. Nous travaillons pour le résoudre le plus rapidement possible.
            </Typography>
            <p className='fr-text--sm fr-mb-5w'>
              Essayez de rafraîchir la page ou bien ressayez plus tard.
            </p>
            <div className='fr-container w-full flex flex-row gap-5 fr-pl-0'>
              <Button
                priority='secondary'
                iconId='fr-icon-home-4-line'
                linkProps={{
                  href: '/'
                }}
              >
                Retourner à la page d’accueil
              </Button>
              <Button
                iconId='fr-icon-refresh-line'
                onClick={() => router.refresh()}
              >
                Rafraîchir la page
              </Button>
            </div>
          </Box>
        </Box>

        <Box
          sx={{
            minWidth: {xs: '100%', md: '300px'},
            display: 'flex',
            justifyContent: {xs: 'center', md: 'flex-start'}
          }}
        >
          <Image
            priority
            width={300}
            height={100}
            src='/images/assets/erreur-technique.svg'
            alt='Erreur technique'
            style={{width: '100%', height: 'auto', maxWidth: 300}}
          />
        </Box>
      </Box>
    </>
  )
}

export default Error
