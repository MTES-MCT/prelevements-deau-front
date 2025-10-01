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

import {deleteDocument} from '@/app/api/points-prelevement.js'
import DocumentsList from '@/components/ui/documents/documents-list.js'

const DocumentsListForm = ({documents, idPreleveur}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [documentsList, setDocumentsList] = useState(documents)
  const [documentToDelete, setDocumentToDelete] = useState()
  const [error, setError] = useState(null)

  const handleDialog = idDocument => {
    setIsDialogOpen(true)
    setDocumentToDelete(idDocument)
  }

  const handleDeleteDocument = async () => {
    const response = await deleteDocument(idPreleveur, documentToDelete)

    if (response.ok) {
      const newDocumentsList = documentsList.filter(d => d._id !== documentToDelete)

      setDocumentsList(newDocumentsList)
      setIsDialogOpen(false)
    } else {
      setError(response.message)
      setIsDialogOpen(false)
    }
  }

  return (
    documentsList?.length > 0 ? (
      <>
        <DocumentsList
          documents={documentsList}
          handleDelete={handleDialog}
        />
        {error && (
          <div className='text-center p-5 text-red-500'>
            <p><b>Un problème est survenu :</b></p>
            {error}
          </div>
        )}
        <Dialog
          open={isDialogOpen}
          maxWidth='md'
          onClose={() => setIsDialogOpen(false)}
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
              onClick={() => setIsDialogOpen(!isDialogOpen)}
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
