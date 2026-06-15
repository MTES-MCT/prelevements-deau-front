'use client'

import {useMemo, useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'

import NewDeclarationForm from './new-declaration-form.js'
import QuickDeclarationForm from './quick-declaration-form.js'

function getPreleveurId(preleveur) {
  return preleveur.id || preleveur.userId || preleveur.declarant?.userId
}

const NewDeclarationEntry = ({
  allowedDeclarationTypes = [],
  availablePreleveurs = [],
  declarantRole,
  quickDeclarationEnabled = true,
  canCreateQuickDeclaration = true
}) => {
  const quickAvailable = useMemo(() => {
    if (quickDeclarationEnabled === false || !canCreateQuickDeclaration) {
      return false
    }

    if (declarantRole !== 'COLLECTEUR') {
      return allowedDeclarationTypes.length > 0
    }

    return availablePreleveurs.some(preleveur => preleveur.quickDeclarationEnabled !== false && (preleveur.allowedDeclarationTypes ?? []).length > 0)
  }, [allowedDeclarationTypes, availablePreleveurs, canCreateQuickDeclaration, declarantRole, quickDeclarationEnabled])

  const fileAvailable = useMemo(() => {
    if (declarantRole !== 'COLLECTEUR') {
      return allowedDeclarationTypes.length > 0
    }

    return availablePreleveurs.some(preleveur => getPreleveurId(preleveur) && (preleveur.allowedDeclarationTypes ?? []).length > 0)
  }, [allowedDeclarationTypes, availablePreleveurs, declarantRole])

  const [mode, setMode] = useState(quickAvailable ? 'quick' : 'file')

  if (!quickAvailable && !fileAvailable) {
    return (
      <Alert
        severity='info'
        title='Aucun type de déclaration disponible'
        description='Votre compte déclarant n’est actuellement autorisé à déposer aucun type de déclaration.'
      />
    )
  }

  return (
    <>
      {quickAvailable && fileAvailable && (
        <SegmentedControl
          className='fr-mb-2w'
          legend='Mode de déclaration'
          segments={[
            {
              iconId: 'fr-icon-edit-line',
              label: 'Saisie rapide',
              nativeInputProps: {
                checked: mode === 'quick',
                onChange: () => setMode('quick')
              }
            },
            {
              iconId: 'fr-icon-upload-line',
              label: 'Dépôt de fichier',
              nativeInputProps: {
                checked: mode === 'file',
                onChange: () => setMode('file')
              }
            }
          ]}
        />
      )}

      {mode === 'quick' && quickAvailable ? (
        <QuickDeclarationForm
          allowedDeclarationTypes={allowedDeclarationTypes}
          availablePreleveurs={availablePreleveurs}
          declarantRole={declarantRole}
          quickDeclarationEnabled={quickDeclarationEnabled}
          canCreateQuickDeclaration={canCreateQuickDeclaration}
        />
      ) : (
        <>
          {!quickAvailable && (
            <Alert
              className='fr-mb-3w'
              severity='info'
              title='Saisie rapide indisponible'
              description='La saisie rapide n’est pas activée pour ce déclarant ou aucun préleveur accessible ne peut l’utiliser.'
            />
          )}
          <NewDeclarationForm
            allowedDeclarationTypes={allowedDeclarationTypes}
            availablePreleveurs={availablePreleveurs}
            declarantRole={declarantRole}
          />
        </>
      )}
    </>
  )
}

export default NewDeclarationEntry
