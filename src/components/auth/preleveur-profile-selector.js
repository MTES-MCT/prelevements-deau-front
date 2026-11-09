'use client'

import {useRef, useState} from 'react'

import Alert from '@codegouvfr/react-dsfr/Alert'
import Button from '@codegouvfr/react-dsfr/Button'
import RadioButtons from '@codegouvfr/react-dsfr/RadioButtons'

import {useAuth} from '@/contexts/auth-context.js'
import {getPreleveurProfileLabel} from '@/lib/preleveur-profiles.js'

export default function PreleveurProfileSelector({preleveurs, currentPreleveurId, selectionRequired}) {
  const {selectPreleveurProfile} = useAuth()
  const [selectedId, setSelectedId] = useState(currentPreleveurId || '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [selectionError, setSelectionError] = useState(false)
  const [reconnect, setReconnect] = useState(false)
  const choicesRef = useRef(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending || reconnect) return
    if (!selectedId) {
      setSelectionError(true)
      choicesRef.current?.querySelector('input[type="radio"]')?.focus()
      return
    }
    setSelectionError(false)
    setPending(true)
    setError(null)

    try {
      const result = await selectPreleveurProfile(selectedId)
      if (result.success) {
        // A full navigation discards cached screens from the previous profile.
        window.location.replace('/')
        return
      }

      setError(result.code === 403
        ? 'Cet établissement n’est plus accessible. Choisissez un autre établissement ou actualisez la liste.'
        : result.code === 401 ? 'Votre session a expiré. Veuillez vous reconnecter.'
          : result.error || 'Impossible de sélectionner cet établissement.')
      setReconnect(result.reconnect === true || result.code === 401)
    } catch {
      setError('La connexion a été interrompue. Veuillez vous reconnecter pour vérifier l’établissement sélectionné.')
      setReconnect(true)
    }
    setPending(false)
  }

  if (!preleveurs.length) {
    return <Alert severity='info' title='Aucun établissement accessible' description='Aucun établissement n’est actuellement associé à votre adresse e-mail.' />
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>Votre adresse e-mail est rattachée à plusieurs établissements. Choisissez celui pour lequel vous voulez déclarer ou consulter les données. Vous pourrez en changer à tout moment.</p>
      <RadioButtons
        ref={choicesRef}
        id='establishment-choice'
        legend='Établissement'
        state={selectionError ? 'error' : 'default'}
        stateRelatedMessage={selectionError ? 'Veuillez choisir un établissement.' : undefined}
        disabled={pending || reconnect}
        options={preleveurs.map(preleveur => ({
          label: getPreleveurProfileLabel(preleveur),
          hintText: [preleveur.city, preleveur.id === currentPreleveurId && 'Établissement actuel'].filter(Boolean).join(' — '),
          nativeInputProps: {
            value: preleveur.id,
            checked: selectedId === preleveur.id,
            'aria-invalid': selectionError || undefined,
            'aria-describedby': selectionError ? 'establishment-choice-desc-error' : undefined,
            onChange: () => {
              setSelectedId(preleveur.id)
              setSelectionError(false)
              setError(null)
            }
          }
        }))}
      />
      {error && <Alert className='fr-mb-3w' severity='error' title='Sélection impossible' description={error} />}
      {reconnect ? <Button linkProps={{href: '/login'}}>Se reconnecter</Button> : (
        <div className='flex flex-wrap gap-3'>
          <Button disabled={pending} type='submit'>{pending ? 'Ouverture en cours…' : 'Continuer'}</Button>
          {!selectionRequired && <Button priority='secondary' disabled={pending} linkProps={{href: '/'}}>Annuler</Button>}
        </div>
      )}
    </form>
  )
}
