import {fr} from '@codegouvfr/react-dsfr'

import Document from '@/components/documents/document.js'

const DocumentsList = ({documents, handleEdit, handleDelete}) => (
  <div className='border m-3'>
    {documents.map((d, index) => (
      <div
        key={d._id}
        className={`flex w-full even:${fr.colors.decisions.artwork.decorative.pinkTuile.default}`}
        style={{
          backgroundColor: index % 2 === 1 ? fr.colors.decisions.background.alt.blueEcume.default : undefined
        }}
      >
        <Document
          document={d}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          className='w-full'
        />
      </div>
    ))}
  </div>
)

export default DocumentsList
