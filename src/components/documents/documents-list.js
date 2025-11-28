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

import {deleteDocument} from '@/app/api/points-prelevement.js'
import DocumentEditDialog from '@/components/documents/document-edit-dialog.js'
import Document from '@/components/documents/document.js'
import SectionCard from '@/components/ui/SectionCard/index.js'

const DocumentsList = ({idPreleveur, documents: initialDocuments, exploitations = []}) => {
  const [documentsList, setDocumentsList] = useState(initialDocuments)
  const [exploitationsList, setExploitationsList] = useState(exploitations)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [documentToEdit, setDocumentToEdit] = useState(null)
  const [documentToDelete, setDocumentToDelete] = useState(null)
  const [error, setError] = useState(null)

  const handleEdit = idDocument => {
    const doc = documentsList.find(d => d._id === idDocument)
    setDocumentToEdit(doc)
    setError(null)
    setIsEditDialogOpen(true)
  }

  const handleDocumentUpdated = updatedDocument => {
    setDocumentsList(prev => prev.map(d => (
      d._id === updatedDocument._id ? updatedDocument : d
    )))
  }

  const handleExploitationsUpdated = (toAdd, toRemove, documentId) => {
    setExploitationsList(prev => prev.map(e => {
      if (toAdd.includes(e._id)) {
        return {...e, documents: [...(e.documents || []), {_id: documentId}]}
      }

      if (toRemove.includes(e._id)) {
        return {...e, documents: e.documents?.filter(d => (d._id || d) !== documentId) || []}
      }

      return e
    }))
  }

  const handleDeleteClick = idDocument => {
    setError(null)
    setDocumentToDelete(idDocument)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    const response = await deleteDocument(documentToDelete)

    if (response.ok) {
      setDocumentsList(prev => prev.filter(d => d._id !== documentToDelete))
      setIsDeleteDialogOpen(false)
    } else {
      setError(response.message)
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <SectionCard
        title='Documents'
        icon='fr-icon-account-line'
        buttonProps={{
          children: 'Ajouter un document',
          iconId: 'fr-icon-add-line',
          priority: 'secondary',
          linkProps: {
            href: `/preleveurs/${idPreleveur}/documents/new`
          }
        }}
      >
        {documentsList.length > 0 ? documentsList.map((d, index) => (
          <div
            key={d._id}
            className='flex w-full'
            style={{
              backgroundColor: index % 2 === 1 ? fr.colors.decisions.background.alt.blueEcume.default : undefined
            }}
          >
            <Document
              className='w-full'
              document={d}
              exploitations={exploitationsList}
              handleDelete={handleDeleteClick}
              handleEdit={handleEdit}
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

      {/* Edit Dialog */}
      <DocumentEditDialog
        document={documentToEdit}
        exploitations={exploitationsList}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onDocumentUpdated={handleDocumentUpdated}
        onExploitationsUpdated={handleExploitationsUpdated}
      />

      {/* Delete Confirmation Dialog */}
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
    </>
  )
}

export default DocumentsList
