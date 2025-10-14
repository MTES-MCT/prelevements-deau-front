import {useState} from 'react'

import GroupedMultiselect from './index.js'

const meta = {
  title: 'Components/GroupedMultiselect',
  component: GroupedMultiselect,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{minHeight: 400}}>
        <Story />
      </div>
    )
  ],
  argTypes: {
    label: {
      control: {type: 'text'},
      description: `Label affiché au-dessus du sélecteur.

**Type**: \`string\``
    },
    hint: {
      control: {type: 'text'},
      description: `Texte d'aide affiché sous le label.

**Type**: \`string\``
    },
    placeholder: {
      control: {type: 'text'},
      description: `Texte affiché quand aucune option n'est sélectionnée.

**Type**: \`string\``
    },
    options: {
      control: {type: 'object'},
      description: `Liste des groupes et options à afficher.

**Schéma**:
\`\`\`js
[
  {
    label: 'Groupe A',
    options: ['Option 1', 'Option 2']
  },
  {
    label: 'Groupe B',
    options: ['Option 3']
  }
]
\`\`\`
- \`label\` : nom du groupe (\`string\`)
- \`options\` : tableau de chaînes (\`string[]\`)`
    },
    value: {
      control: false,
      description: `Valeur sélectionnée (contrôlée en interne dans la story).

**Type**: \`string[]\``
    },
    onChange: {
      control: false,
      description: `Callback appelée lors d'un changement de sélection.

**Signature**:
\`\`\`js
(newValue: string[]) => void
\`\`\``
    },
    disabled: {
      control: {type: 'boolean'},
      description: `Désactive le composant.

**Type**: \`boolean\``
    }
  }
}

const defaultOptions = [
  {
    label: 'Groupe A',
    options: ['Oliver Hansen', 'Van Henry', 'April Tucker']
  },
  {
    label: 'Groupe B',
    options: [
      {value: 'Ralph Hubbard', content: <div>Ralph Hubbard</div>},
      {value: 'Omar Alexander', content: <div>Omar Alexander</div>},
      {value: 'Carlos Abbott', content: <div>Carlos Abbott</div>}
    ]
  }
]

const Wrapper = ({
  label = 'Sélectionnez des options',
  hint = 'Vous pouvez sélectionner plusieurs éléments',
  placeholder = 'Choisissez...',
  options = defaultOptions,
  ...props
}) => {
  const [selected, setSelected] = useState(props.value || [])

  const handleChange = value => setSelected(value)

  return (
    <GroupedMultiselect
      {...props}
      label={label}
      hint={hint}
      placeholder={placeholder}
      options={options}
      value={selected}
      onChange={handleChange}
    />
  )
}

export default meta

export const ParDéfaut = {
  args: {
    label: 'Sélectionnez des options',
    hint: 'Vous pouvez sélectionner plusieurs éléments',
    placeholder: 'Choisissez...',
    options: defaultOptions,
    value: []
  },
  parameters: {
    docs: {
      description: {
        story: 'Comportement par défaut du sélecteur avec deux groupes d\'options.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const AvecOptionsPréselectionnées = {
  args: {
    label: 'Sélectionnez des options',
    hint: 'Quelques options sont déjà sélectionnées',
    placeholder: 'Choisissez...',
    options: defaultOptions,
    value: ['Oliver Hansen', 'Carlos Abbott']
  },
  parameters: {
    docs: {
      description: {
        story: 'Le sélecteur démarre avec certaines options déjà sélectionnées.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const GroupeUnique = {
  args: {
    label: 'Un seul groupe',
    hint: 'Test avec un seul groupe d\'options',
    placeholder: 'Choisissez...',
    options: [
      {
        label: 'Groupe Unique',
        options: ['Alice', 'Bob', 'Charlie']
      }
    ],
    value: []
  },
  parameters: {
    docs: {
      description: {
        story: 'Affiche un seul groupe d\'options pour tester le rendu.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const SansGroupe = {
  args: {
    label: 'Sans groupe',
    hint: 'Test avec des options sans groupe',
    placeholder: 'Choisissez...',
    options: [
      'Alice',
      'Bob',
      'Charlie'
    ],
    value: []
  },
  parameters: {
    docs: {
      description: {
        story: 'Affiche des options sans groupe pour tester le rendu.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const ListeVide = {
  args: {
    label: 'Aucune option',
    hint: 'Aucune option disponible',
    placeholder: 'Rien à sélectionner',
    options: [],
    value: []
  },
  parameters: {
    docs: {
      description: {
        story: 'Test du composant avec une liste d\'options vide.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const Désactivé = {
  args: {
    label: 'Sélecteur désactivé',
    hint: 'Le sélecteur est désactivé',
    disabled: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Le sélecteur est dans un état désactivé et n\'accepte pas d\'interactions.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

export const AvecÉlémentsPersonnalisés = {
  args: {
    label: 'Options personnalisées',
    hint: 'Chaque option utilise un rendu personnalisé',
    placeholder: 'Choisissez...',
    options: [
      {
        label: 'Groupe A',
        options: [
          {value: 'Alice', content: <div style={{color: 'red'}}>Alice</div>},
          {value: 'Bob', content: <div style={{fontWeight: 'bold'}}>Bob</div>}
        ]
      },
      {
        label: 'Groupe B',
        options: [
          {value: 'Charlie', content: <div style={{fontStyle: 'italic'}}>Charlie</div>},
          {value: 'David', content: <div style={{textDecoration: 'underline'}}>David</div>}
        ]
      }
    ]
  },
  parameters: {
    docs: {
      description: {
        story: 'Utilisation d\'options avec un rendu personnalisé via la propriété `content`.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}
