'use client'

import {useState} from 'react'

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
  const [reconnect, setReconnect] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending || !selectedId || reconnect) return
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
        ? 'Ce préleveur n’est plus accessible. Choisissez un autre préleveur ou actualisez la liste.'
        : result.code === 401 ? 'Votre session a expiré. Veuillez vous reconnecter.'
          : result.error || 'Impossible de sélectionner ce préleveur.')
      setReconnect(result.reconnect === true || result.code === 401)
    } catch {
      setError('La connexion a été interrompue. Veuillez vous reconnecter pour vérifier le préleveur sélectionné.')
      setReconnect(true)
    }
    setPending(false)
  }

  if (!preleveurs.length) {
    return <Alert severity='info' title='Aucun préleveur accessible' description='Aucun préleveur n’est actuellement associé à votre adresse email.' />
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>Votre adresse email vous permet d’accéder aux préleveurs ci-dessous. Choisissez celui pour lequel vous souhaitez travailler.</p>
      <RadioButtons
        legend='Préleveur'
        disabled={pending || reconnect}
        options={preleveurs.map(preleveur => ({
          label: getPreleveurProfileLabel(preleveur),
          hintText: [preleveur.city, preleveur.id === currentPreleveurId && 'Préleveur actuel'].filter(Boolean).join(' — '),
          nativeInputProps: {
            value: preleveur.id,
            checked: selectedId === preleveur.id,
            onChange: () => setSelectedId(preleveur.id)
          }
        }))}
      />
      {error && <Alert className='fr-mb-3w' severity='error' title='Sélection impossible' description={error} />}
      {reconnect ? <Button linkProps={{href: '/login'}}>Se reconnecter</Button> : (
        <div className='flex flex-wrap gap-3'>
          <Button disabled={pending || !selectedId} type='submit'>{pending ? 'Ouverture en cours…' : 'Continuer avec ce préleveur'}</Button>
          {!selectionRequired && <Button priority='secondary' disabled={pending} linkProps={{href: '/'}}>Annuler</Button>}
        </div>
      )}
    </form>
  )
}
