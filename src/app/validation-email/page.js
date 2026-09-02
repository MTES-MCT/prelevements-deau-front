'use client'

import {useEffect, useRef, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import Link from 'next/link'
import {signOut} from 'next-auth/react'

import {
  EMAIL_VERIFICATION_PURPOSES,
  extractEmailVerification,
  getConfirmationOutcome,
  requiresEmailVerificationReauthentication,
  takeEmailVerificationValueOnce
} from '@/lib/email-verification.js'
import {confirmEmailVerificationAction} from '@/server/actions/user.js'

const ValidationEmailPage = () => {
  const [result, setResult] = useState({status: 'READING'})
  const [attempt, setAttempt] = useState(0)
  const tokenRead = useRef(false)
  const confirmationToken = useRef(null)

  useEffect(() => {
    let token = confirmationToken.current

    if (!tokenRead.current) {
      let storage = null

      try {
        storage = window.sessionStorage
      } catch {
        // Le fragment a tout de même été retiré avant le rendu de la page.
      }

      token = takeEmailVerificationValueOnce(storage, tokenRead)

      if (token === undefined) {
        return
      }

      confirmationToken.current = token
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    } else if (attempt === 0) {
      // Deuxième exécution de l’effet en StrictMode : la requête est déjà partie.
      return
    }

    if (!token) {
      setResult({status: 'INVALID'})
      return
    }

    const confirm = async () => {
      try {
        const response = await confirmEmailVerificationAction(token)
        const outcome = getConfirmationOutcome(response)
        const payload = response.data
        const verification = extractEmailVerification(payload)
        const purpose = payload?.purpose ?? verification?.purpose ?? null
        const requiresReauthentication = requiresEmailVerificationReauthentication(payload)

        if (outcome === 'VERIFIED' && requiresReauthentication) {
          try {
            await signOut({redirect: false})
          } catch {
            // L’API a déjà révoqué la session ; la page reste publique.
          }
        }

        if (outcome !== 'ERROR') {
          confirmationToken.current = null
        }

        setResult({
          status: outcome,
          purpose,
          email: payload?.email ?? verification?.email ?? null,
          requiresReauthentication
        })
      } catch {
        setResult({status: 'ERROR'})
      }
    }

    setResult({status: 'CONFIRMING'})
    confirm()
  }, [attempt])

  const isLoading = result.status === 'READING' || result.status === 'CONFIRMING'
  const isPrimaryChange = result.requiresReauthentication
    || result.purpose === EMAIL_VERIFICATION_PURPOSES.primary

  return (
    <div className='fr-container fr-my-8w'>
      <div className='fr-grid-row fr-grid-row--center'>
        <div className='fr-col-12 fr-col-md-8 fr-col-lg-6'>
          <h1>Validation de l’adresse e-mail</h1>

          {isLoading && (
            <Alert
              severity='info'
              title='Validation en cours'
              description='Nous vérifions ce lien. Cette opération ne prend que quelques instants.'
            />
          )}

          {result.status === 'VERIFIED' && isPrimaryChange && (
            <>
              <Alert
                severity='success'
                title='Nouvelle adresse principale validée'
                description='Votre adresse a été modifiée. Pour votre sécurité, toutes les sessions ont été fermées.'
              />
              <p className='fr-mt-4w fr-mb-0'>
                <Link className='fr-btn' href='/login'>Me reconnecter</Link>
              </p>
            </>
          )}

          {result.status === 'VERIFIED' && !isPrimaryChange && (
            <>
              <Alert
                severity='success'
                title='Adresse de connexion validée'
                description='Cette adresse peut maintenant être utilisée pour accéder à votre compte.'
              />
              <p className='fr-mt-4w fr-mb-0'>
                <Link className='fr-btn' href='/mon-compte/adresses-email'>Voir mes adresses</Link>
              </p>
            </>
          )}

          {result.status === 'EXPIRED' && (
            <>
              <Alert
                severity='warning'
                title='Ce lien a expiré'
                description='Votre adresse n’a pas été modifiée. Depuis la gestion de vos adresses, renvoyez un nouveau message de validation.'
              />
              <p className='fr-mt-4w fr-mb-0'>
                <Link className='fr-btn fr-btn--secondary' href='/mon-compte/adresses-email'>Gérer mes adresses</Link>
              </p>
            </>
          )}

          {result.status === 'CONFLICT' && (
            <>
              <Alert
                severity='error'
                title='Cette adresse n’est plus disponible'
                description='Elle est déjà utilisée par un autre compte. Aucune modification n’a été effectuée.'
              />
              <p className='fr-mt-4w fr-mb-0'>
                <Link className='fr-btn fr-btn--secondary' href='/mon-compte/adresses-email'>Choisir une autre adresse</Link>
              </p>
            </>
          )}

          {result.status === 'INVALID' && (
            <Alert
              severity='error'
              title='Lien invalide'
              description='Ce lien est incomplet, a déjà été utilisé ou a été remplacé par une demande plus récente.'
            />
          )}

          {result.status === 'ERROR' && (
            <>
              <Alert
                severity='error'
                title='Validation temporairement impossible'
                description='Une erreur technique a empêché la validation. Vous pouvez réessayer sans rouvrir le lien.'
              />
              <p className='fr-mt-4w fr-mb-0'>
                <Button onClick={() => setAttempt(previous => previous + 1)}>
                  Réessayer
                </Button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ValidationEmailPage
