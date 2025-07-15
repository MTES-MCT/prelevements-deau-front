'use client'
import React, {useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {PasswordInput} from '@codegouvfr/react-dsfr/blocks/PasswordInput'
import {Button} from '@codegouvfr/react-dsfr/Button'
import SelfTraining from '@codegouvfr/react-dsfr/picto/SelfTraining'
import {Typography, Box} from '@mui/material'
import {signIn} from 'next-auth/react'

import Pictogram from '@/components/ui/pictogram.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

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

      <Box className='h-full flex align-center p-4'>
        <Box className='flex w-full justify-center items-center'>
          <Box className='p-4 w-fit h-fit border border-[var(--artwork-motif-grey)]'>
            <Box className='flex flex-col items-center gap-4'>
              <Pictogram pictogram={SelfTraining} />
              <Typography variant='h4' component='h2' sx={{fontWeight: 500}}>
                Connexion à l’espace instructeur
              </Typography>
            </Box>
            <div className='flex flex-1 flex-col justify-center p-6'>
              <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                <form className='space-y-3' onSubmit={handleSubmit}>
                  <div className='mt-2'>
                    <PasswordInput
                      required
                      className={params.error ? 'fr-input-group--error' : ''}
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
