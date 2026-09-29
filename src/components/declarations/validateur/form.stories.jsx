import {useState} from 'react'

import FileValidateurForm from './form.js'

const declarationTypes = [
  {code: 'gespoint-file', name: 'Fichier de gestion des prélèvements'},
  {code: 'template-file', name: 'Modèle de déclaration de volumes'}
]

const FormExample = ({initialDeclarationType = 'gespoint-file'}) => {
  const [selectedDeclarationTypeCode, setSelectedDeclarationTypeCode] = useState(initialDeclarationType)
  const [comment, setComment] = useState('')
  const [files, setFiles] = useState([])

  return (
    <div style={{maxWidth: 640, margin: '0 auto', padding: 16}}>
      <FileValidateurForm
        allowedDeclarationTypes={declarationTypes}
        comment={comment}
        selectedDeclarationTypeCode={selectedDeclarationTypeCode}
        resetForm={() => setFiles([])}
        onCommentChange={setComment}
        onDeclarationTypeChange={setSelectedDeclarationTypeCode}
        handleSubmit={setFiles}
      />
      <output aria-label='Fichiers sélectionnés'>
        {files.map(file => file.name).join(', ')}
      </output>
    </div>
  )
}

export default {
  title: 'Declarations/Selection des fichiers',
  component: FileValidateurForm,
  render: args => <FormExample {...args} />
}

export const Disponible = {}

export const TypeASelectionner = {
  args: {initialDeclarationType: ''}
}
