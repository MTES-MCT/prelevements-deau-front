'use client'

import {useEffect, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'

const SUBMITTED_QUERY_PARAM = 'submitted'

const DeclarationSubmissionFlash = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const url = new URL(window.location.href)

    if (url.searchParams.get(SUBMITTED_QUERY_PARAM) !== '1') {
      return
    }

    url.searchParams.delete(SUBMITTED_QUERY_PARAM)
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    setVisible(true)
  }, [])

  if (!visible) {
    return null
  }

  return (
    <Alert
      closable
      className='fr-mb-4w'
      severity='success'
      title='Merci ! Votre déclaration a bien été enregistrée.'
      description='Vos données contribuent à une meilleure connaissance partagée de la ressource en eau sur votre territoire. Vous pouvez retrouver l’ensemble de vos déclarations à tout moment depuis votre espace.'
      onClose={() => setVisible(false)}
    />
  )
}

export default DeclarationSubmissionFlash
