'use client'
import React, {useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {PasswordInput} from '@codegouvfr/react-dsfr/blocks/PasswordInput'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography, Box} from '@mui/material'
import dynamic from 'next/dynamic'
import {signIn} from 'next-auth/react'

import Pictogram from '@/components/ui/pictogram.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const DynamicBreadcrumb = dynamic(
  () => import('@codegouvfr/react-dsfr/Breadcrumb')
)

const LoginPage = ({searchParams}) => {
  const params = React.use(searchParams)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = event => {
    const {value} = event.target
    setInput(value)
  }

  const handleSubmit = async event => {
    setIsLoading(true)

    event.preventDefault()
    await signIn('credentials', {
      password: input,
      callbackUrl: searchParams.callbackUrl || '/'
    })

    setIsLoading(false)
  }

  return (
    <>
      <StartDsfrOnHydration />
      <Box className='fr-container' sx={{paddingBottom: '2rem'}}>
        <DynamicBreadcrumb
          currentPageLabel='Connexion'
          homeLinkProps={{
            href: '/'
          }}
          segments={[]}
        />
        <Box sx={{display: 'flex', width: '100%', justifyContent: 'center'}}>
          <Box sx={{
            padding: 4, width: 'fit-content', border: `solid 1px ${fr.colors.options.grey._925_125.default}`
          }}
          >
            <Box sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
            }}
            >
              <Pictogram pictoName='self-training' />
              <Typography variant='h4' component='h2'>Connexion à l’espace instructeur</Typography>
            </Box>
            <div className='flex flex-1 flex-col justify-center p-6'>
              <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                <form className='space-y-3' onSubmit={handleSubmit}>
                  <div className='mt-2'>
                    <PasswordInput
                      required
                      className={params.error && 'fr-input-group--error'}
                      id='password'
                      label='* Mot de passe'
                      name='password'
                      value={input || ''}
                      onChange={handleChange}
                    />
                  </div>

                  <Button
                    type='submit'
                    disabled={input.length === 0 || isLoading}
                    className='w-full justify-center'
                  >
                    {isLoading ? 'Connexion…' : 'Se connecter'}
                  </Button>

                  {params.error && (
                    <Alert
                      small
                      description='Le mot de passe est incorrect.'
                      severity='error'
                    />
                  )}
                </form>
              </div>
            </div>
          </Box>
        </Box>
      </Box>
    </>
  )
}

export default LoginPage

