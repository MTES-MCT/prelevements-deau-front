'use client'

import {useEffect, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'

const DeclarationSubmissionFlash = () => {
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    const url = new URL(window.location.href)

    const parameter = url.searchParams.get('updated') === '1' ? 'updated' : 'submitted'
    if (url.searchParams.get(parameter) !== '1') {
      return
    }

    url.searchParams.delete(parameter)
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    setNotice(parameter)
  }, [])

  if (!notice) {
    return null
  }

  return (
    <Alert
      closable
      className='fr-mb-4w'
      severity='success'
      title={notice === 'updated' ? 'La déclaration a été modifiée.' : 'Merci ! Votre déclaration a bien été enregistrée.'}
      description={notice === 'submitted' ? 'Vos données contribuent à une meilleure connaissance partagée de la ressource en eau sur votre territoire. Vous pouvez retrouver l’ensemble de vos déclarations à tout moment depuis votre espace.' : undefined}
      onClose={() => setNotice(null)}
    />
  )
}

export default DeclarationSubmissionFlash
