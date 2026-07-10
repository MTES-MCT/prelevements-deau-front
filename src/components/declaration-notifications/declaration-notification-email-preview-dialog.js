'use client'

import {useEffect, useState} from 'react'

import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs
} from '@mui/material'

function formatScheduledFor(value) {
  if (!value) {
    return 'Non renseignée'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short'
  }).format(new Date(value))
}

function formatVariableValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Valeur vide'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

const DeclarationNotificationEmailPreviewDialog = ({state, onClose}) => {
  const {open = false, loading = false, error = null, data = null} = state || {}
  const [activeTab, setActiveTab] = useState('preview')
  const variables = Object.entries(data?.params || {})

  useEffect(() => {
    if (open) {
      setActiveTab('preview')
    }
  }, [open, data?.recipient?.email])

  return (
    <Dialog fullWidth maxWidth='lg' open={open} onClose={onClose}>
      <DialogTitle>Aperçu du mail</DialogTitle>
      <DialogContent dividers>
        <Alert severity='info' className='fr-mb-3w'>
          Cet aperçu est approximatif : le rendu final peut varier dans Brevo et selon la messagerie du destinataire. Pour un envoi passé, le template actuel peut avoir changé depuis l’envoi. Aucun mail n’est envoyé.
        </Alert>

        {loading && (
          <div className='flex justify-center items-center min-h-48'>
            <CircularProgress size={32} />
          </div>
        )}

        {error && <Alert severity='error'>{error}</Alert>}

        {data && !loading && (
          <div className='flex flex-col gap-4'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3 fr-text--sm'>
              <div>
                <strong>Destinataire</strong><br />
                {data.recipient?.name || 'Nom non renseigné'}<br />
                {data.recipient?.email}
              </div>
              <div>
                <strong>Template Brevo</strong><br />
                {data.templateName || `Template ${data.templateId}`} · #{data.templateId}
              </div>
              <div>
                <strong>Date prévue de l’envoi automatique</strong><br />
                {formatScheduledFor(data.scheduledFor)}
              </div>
            </div>

            <Tabs
              aria-label='Contenu de l’aperçu du mail'
              value={activeTab}
              onChange={(_event, value) => setActiveTab(value)}
            >
              <Tab label='Aperçu' value='preview' />
              <Tab label='Variables' value='variables' />
            </Tabs>

            {activeTab === 'preview' && (
              <div className='flex flex-col gap-4'>
                <div className='fr-p-2w fr-background-alt--grey'>
                  <p className='fr-text--xs fr-text--bold fr-mb-1v'>Objet</p>
                  <p className='fr-text--sm fr-mb-0'>{data.subject || 'Objet non renseigné'}</p>
                </div>

                {data.unresolvedPlaceholders?.length > 0 && (
                  <Alert severity='warning'>
                    Variables non interprétées dans cet aperçu : {data.unresolvedPlaceholders.join(', ')}
                  </Alert>
                )}

                {data.htmlContent ? (
                  <iframe
                    className='w-full min-h-[60vh] border border-gray-200 bg-white'
                    sandbox=''
                    srcDoc={data.htmlContent}
                    title={`Aperçu du mail pour ${data.recipient?.email || 'le destinataire'}`}
                  />
                ) : (
                  <pre className='whitespace-pre-wrap fr-p-3w fr-background-alt--grey fr-text--sm'>
                    {data.textContent || 'Ce template ne contient aucun contenu prévisualisable.'}
                  </pre>
                )}
              </div>
            )}

            {activeTab === 'variables' && (
              variables.length > 0
                ? (
                  <div className='overflow-auto border border-gray-200'>
                    <table className='w-full text-sm border-collapse'>
                      <thead>
                        <tr className='bg-gray-50'>
                          <th className='text-left p-3 border-b'>Variable Brevo</th>
                          <th className='text-left p-3 border-b'>Valeur envoyée</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variables.map(([name, value]) => (
                          <tr key={name}>
                            <td className='p-3 border-b whitespace-nowrap'>
                              <code>{`{{ params.${name} }}`}</code>
                            </td>
                            <td className='p-3 border-b whitespace-pre-wrap break-words'>
                              {formatVariableValue(value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
                : <Alert severity='info'>Aucune variable n’est envoyée à ce template.</Alert>
            )}
          </div>
        )}
      </DialogContent>
      <DialogActions className='m-3'>
        <button className='fr-btn fr-btn--secondary' type='button' onClick={onClose}>Fermer</button>
      </DialogActions>
    </Dialog>
  )
}

export default DeclarationNotificationEmailPreviewDialog
