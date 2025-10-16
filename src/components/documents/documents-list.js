import {fr} from '@codegouvfr/react-dsfr'

import Document from '@/components/documents/document.js'
import SectionCard from '@/components/ui/SectionCard/index.js'

const DocumentsList = ({idPreleveur, documents, handleEdit, handleDelete}) => (
  <SectionCard title='Documents' icon='fr-icon-account-line' buttonProps={{
    children: 'Gérer les documents',
    iconId: 'fr-icon-draft-line',
    priority: 'secondary',
    linkProps: {
      href: `/preleveurs/${idPreleveur}/documents`
    }
  }}
  >
    {documents.length > 0 ? documents.map((d, index) => (
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
    )) : (<p><i>Pas de documents</i></p>)}
  </SectionCard>
)

export default DocumentsList
