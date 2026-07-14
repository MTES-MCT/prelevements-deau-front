'use client'

import {useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Button} from '@codegouvfr/react-dsfr/Button'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'

import DocumentEditDialog from '@/components/documents/document-edit-dialog.js'
import Document from '@/components/documents/document.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {deleteDocumentAction} from '@/server/actions/index.js'

const DocumentsList = ({
  canCreate = false,
  canDelete = false,
  canUpdate = false,
  idPreleveur,
  documents: initialDocuments = [],
  exploitations = []
}) => {
  const [documentsList, setDocumentsList] = useState(initialDocuments)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [documentToEdit, setDocumentToEdit] = useState(null)
  const [documentToDelete, setDocumentToDelete] = useState(null)
  const [error, setError] = useState(null)

  const handleEdit = documentId => {
    const document = documentsList.find(document => document.id === documentId)
    setDocumentToEdit(document)
    setError(null)
    setIsEditDialogOpen(true)
  }

  const handleDocumentUpdated = updatedDocument => {
    setDocumentsList(previous => previous.map(document => (
      document.id === updatedDocument.id ? updatedDocument : document
    )))
  }

  const handleDeleteClick = documentId => {
    setError(null)
    setDocumentToDelete(documentId)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    const response = await deleteDocumentAction(documentToDelete, idPreleveur)

    if (response.success && response.data?.deleted !== false) {
      setDocumentsList(previous => previous.filter(document => document.id !== documentToDelete))
      setIsDeleteDialogOpen(false)
      return
    }

    setError(response.error || 'La suppression du document a échoué.')
    setIsDeleteDialogOpen(false)
  }

  return (
    <>
      <SectionCard
        title='Documents'
        icon='fr-icon-account-line'
        buttonProps={canCreate ? {
          children: 'Ajouter un document',
          iconId: 'fr-icon-add-line',
          priority: 'secondary',
          linkProps: {
            href: `/declarants/${idPreleveur}/documents/new`
          }
        } : undefined}
        editorOnly={false}
      >
        {documentsList.length > 0 ? documentsList.map((document, index) => (
          <div
            key={document.id}
            className='flex w-full'
            style={{
              backgroundColor: index % 2 === 1 ? fr.colors.decisions.background.alt.blueEcume.default : undefined
            }}
          >
            <Document
              className='w-full'
              document={document}
              exploitations={exploitations}
              handleDelete={canDelete ? handleDeleteClick : undefined}
              handleEdit={canUpdate ? handleEdit : undefined}
            />
          </div>
        )) : (<p><i>Pas de documents</i></p>)}
      </SectionCard>

      {error && (
        <Alert
          closable
          className='mt-3'
          severity='error'
          title='Un problème est survenu'
          description={error}
          onClose={() => setError(null)}
        />
      )}

      {canUpdate && (
        <DocumentEditDialog
          declarantId={idPreleveur}
          document={documentToEdit}
          exploitations={exploitations}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onDocumentUpdated={handleDocumentUpdated}
        />
      )}

      {canDelete && (
        <Dialog
          maxWidth='md'
          open={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
        >
          <DialogTitle>
            <InfoOutlined className='mr-3' />
            Confirmer la suppression du document
          </DialogTitle>
          <DialogContent>
            Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.
          </DialogContent>
          <DialogActions className='m-3'>
            <Button
              priority='secondary'
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              style={{backgroundColor: 'red'}}
              onClick={handleConfirmDelete}
            >
              Supprimer ce document
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}

export default DocumentsList
