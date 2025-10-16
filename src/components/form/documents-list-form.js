'use client'

import {useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material'

import {deleteDocument, updateDocument} from '@/app/api/points-prelevement.js'
import DocumentsList from '@/components/documents/documents-list.js'
import DocumentForm from '@/components/form/document-form.js'
import {emptyStringToNull} from '@/utils/string.js'

const DocumentsListForm = ({documents, idPreleveur}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [payload, setPayload] = useState({})
  const [document, setDocument] = useState()
  const [documentsList, setDocumentsList] = useState(documents)
  const [documentToDelete, setDocumentToDelete] = useState()
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])

  const handlePayload = async () => {
    setError(null)
    setValidationErrors([])

    if (Object.keys(payload).length === 0) {
      setIsEditDialogOpen(false)
      return
    }

    try {
      const cleanedPayload = emptyStringToNull(payload)
      const response = await updateDocument(document._id, idPreleveur, cleanedPayload)

      if (response.code === 400) {
        if (response.validationErrors) {
          setValidationErrors(response.validationErrors)
        } else {
          setError(response.message)
        }
      } else {
        const newDocumentsList = documentsList.map(d => (
          d._id === document._id ? response : d
        ))

        setDocumentsList(newDocumentsList)
        setIsEditDialogOpen(false)
      }
    } catch (error) {
      setError(error.message)
    }
  }

  const handleEdit = idDocument => {
    const documentToEdit = documentsList.find(d => d._id === idDocument)
    setDocument(documentToEdit)
    setIsEditDialogOpen(true)
  }

  const handleDeleteDialog = idDocument => {
    setError(null)
    setIsDeleteDialogOpen(true)
    setDocumentToDelete(idDocument)
  }

  const handleDeleteDocument = async () => {
    const response = await deleteDocument(idPreleveur, documentToDelete)

    if (response.ok) {
      const newDocumentsList = documentsList.filter(d => d._id !== documentToDelete)

      setDocumentsList(newDocumentsList)
      setIsDeleteDialogOpen(false)
    } else {
      setError(response.message)
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    documentsList?.length > 0 ? (
      <>
        <DocumentsList
          documents={documentsList}
          idPreleveur={idPreleveur}
          handleDelete={handleDeleteDialog}
          handleEdit={handleEdit}
        />
        {error && (
          <div className='text-center p-5 text-red-500'>
            <p><b>Un problème est survenu :</b></p>
            {error}
          </div>
        )}
        <Dialog
          open={isEditDialogOpen}
          maxWidth='md'
          onClose={() => setIsEditDialogOpen(false)}
        >
          <DialogTitle>
            <InfoOutlined className='mr-3' />
            Édition du document : {document?.nom_fichier}
          </DialogTitle>
          <DialogContent>
            <DocumentForm
              document={document}
              setDocument={setPayload}
            />
            {validationErrors?.length > 0 && (
              <div className='text-center p-5 text-red-500'>
                <p><b>{validationErrors.length === 1 ? 'Problème de validation :' : 'Problèmes de validation :'}</b></p>
                {validationErrors.map(err => (
                  <p key={err.message}>{err.message}</p>
                )
                )}
              </div>
            )}
          </DialogContent>
          <DialogActions className='m-3'>
            <Button
              priority='secondary'
              onClick={() => setIsEditDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              className='my-5'
              onClick={handlePayload}
            >
              Valider les modifications
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={isDeleteDialogOpen}
          maxWidth='md'
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
              onClick={() => setIsDeleteDialogOpen(!isDeleteDialogOpen)}
            >
              Annuler
            </Button>
            <Button
              style={{backgroundColor: 'red'}}
              onClick={handleDeleteDocument}
            >
              Supprimer ce document
            </Button>
          </DialogActions>
        </Dialog>
      </>
    ) : (
      <div>
        <i>Pas de documents associés à ce préleveur</i>
      </div>
    )
  )
}

export default DocumentsListForm
