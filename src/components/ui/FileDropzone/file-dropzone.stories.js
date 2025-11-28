import {useState} from 'react'

import FileDropzone from './index.js'

const meta = {
  title: 'Components/FileDropzone',
  component: FileDropzone,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{maxWidth: 600, margin: '0 auto'}}>
        <Story />
      </div>
    )
  ],
  argTypes: {
    accept: {
      control: {type: 'text'},
      description: `Types de fichiers acceptés (attribut HTML accept).

**Type**: \`string\`

**Défaut**: \`'.pdf,.doc,.docx,.xls,.xlsx,.odt,.ods'\``
    },
    disabled: {
      control: {type: 'boolean'},
      description: `Désactive le composant.

**Type**: \`boolean\`

**Défaut**: \`false\``
    },
    hint: {
      control: {type: 'text'},
      description: `Texte d'aide affiché sous le bouton.

**Type**: \`string\`

**Défaut**: \`'Format PDF, Word, Excel - Max 50MB'\``
    },
    label: {
      control: {type: 'text'},
      description: `Label principal affiché dans la zone.

**Type**: \`string\`

**Défaut**: \`'Glissez-déposez votre fichier ici'\``
    },
    multiple: {
      control: {type: 'boolean'},
      description: `Autorise la sélection de plusieurs fichiers.

**Type**: \`boolean\`

**Défaut**: \`false\``
    },
    onChange: {
      action: 'changed',
      description: `Callback appelée lors d'un changement de fichier(s).

**Signature**:
\`\`\`js
(files: FileList | null) => void
\`\`\``
    },
    value: {
      control: false,
      description: `Liste des fichiers sélectionnés (contrôlée).

**Type**: \`FileList | null\``
    }
  }
}

export default meta

const Wrapper = args => {
  const [files, setFiles] = useState(null)

  return (
    <FileDropzone
      {...args}
      value={files}
      onChange={setFiles}
    />
  )
}

export const ParDéfaut = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Comportement par défaut de la zone de dépôt de fichiers. Glissez-déposez un fichier ou cliquez sur le bouton pour sélectionner un fichier.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const AvecLabelPersonnalisé = {
  args: {
    label: 'Déposez votre document PDF ici',
    hint: 'Seuls les fichiers PDF sont acceptés - Max 10MB',
    accept: '.pdf'
  },
  parameters: {
    docs: {
      description: {
        story: 'Zone de dépôt avec un label et un hint personnalisés, acceptant uniquement les PDF.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const FichiersMultiples = {
  args: {
    multiple: true,
    label: 'Glissez-déposez vos fichiers ici',
    hint: 'Vous pouvez sélectionner plusieurs fichiers'
  },
  parameters: {
    docs: {
      description: {
        story: 'Mode multi-fichiers permettant de sélectionner plusieurs fichiers à la fois.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const Désactivé = {
  args: {
    disabled: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Zone de dépôt désactivée, aucune interaction possible.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const AcceptImages = {
  args: {
    accept: 'image/*',
    label: 'Glissez-déposez une image ici',
    hint: 'Formats acceptés : JPG, PNG, GIF, WebP'
  },
  parameters: {
    docs: {
      description: {
        story: 'Zone de dépôt configurée pour accepter uniquement les images.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

// Story with pre-selected file (simulated)
const WrapperWithFile = () => {
  const [files, setFiles] = useState(() => {
    // Create a mock FileList with a fake file for demo
    const dt = new DataTransfer()
    const blob = new Blob(['demo content'], {type: 'application/pdf'})
    const file = new File([blob], 'document-exemple.pdf', {type: 'application/pdf'})
    dt.items.add(file)
    return dt.files
  })

  return (
    <FileDropzone
      value={files}
      onChange={setFiles}
    />
  )
}

export const AvecFichierSimulé = {
  parameters: {
    docs: {
      description: {
        story: 'Simulation d\'un fichier déjà sélectionné. Dans cet exemple, le fichier est ajouté manuellement pour démonstration.'
      }
    }
  },
  render: () => <WrapperWithFile />
}
