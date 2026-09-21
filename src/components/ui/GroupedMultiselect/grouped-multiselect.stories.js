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
    options: [
      {
        value: 'Option 3',
        content: <div>Option 3</div>,
        disabled: true,
        disabledReason: 'Raison facultative affichée en info-bulle'
      }
    ]
  }
]
\`\`\`
- \`label\` : nom du groupe (\`string\`)
- \`options\` : tableau de chaînes (\`string[]\`) ou d'objets {value, content, disabled?, disabledReason?}`
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
    },
    searchable: {
      control: {type: 'boolean'},
      description: 'Affiche une recherche dans les options.'
    },
    confirmSelection: {
      control: {type: 'boolean'},
      description: 'Conserve un brouillon jusqu’à Appliquer. Échap, Annuler ou la sortie du sélecteur abandonnent les changements.'
    },
    showSelectionActions: {
      control: {type: 'boolean'},
      description: 'Affiche les actions de sélection groupée, limitées aux résultats activables de la recherche.'
    },
    minSelected: {
      control: {type: 'number', min: 0},
      description: 'Nombre minimum de choix nécessaire pour appliquer le brouillon.'
    },
    minSelectionMessage: {
      control: {type: 'text'},
      description: 'Message facultatif lorsque le brouillon ne contient pas assez de choix.'
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

const formatOptionContent = (label, frequency, valueType) => (
  <div className='selector-option-content'>
    <div className='selector-option-header'>
      <span className='selector-option-label'>{label}</span>
      {valueType && (
        <span className='selector-option-value-type'>{valueType}</span>
      )}
    </div>
    {frequency && (
      <span className='selector-option-frequency'>{frequency}</span>
    )}
  </div>
)

const restrictedOptions = [
  {
    label: 'Volume (m3)',
    options: [
      {
        value: 'volume-2023',
        content: formatOptionContent('Volume prélevé 2023', 'jours', 'Cumulée sur période')
      },
      {
        value: 'volume-2024',
        content: formatOptionContent('Volume prélevé 2024', 'jours', 'Cumulée sur période')
      }
    ]
  },
  {
    label: 'Débit (L/s)',
    options: [
      {
        value: 'debit-2023',
        content: formatOptionContent('Débit prélevé 2023', 'jours', 'maximum')
      },
      {
        value: 'debit-2024',
        content: formatOptionContent('Débit prélevé 2024', '15 minutes', 'moyenne')
      }
    ]
  },
  {
    label: 'Autres unités',
    options: [
      {
        value: 'conductivite',
        content: formatOptionContent('Conductivité', 'jours', 'maximum'),
        disabled: true,
        disabledReason: 'Deux unités différentes sont déjà sélectionnées.'
      },
      {
        value: 'ph',
        content: formatOptionContent('pH', 'jours', 'moyenne'),
        disabled: true,
        disabledReason: 'Deux unités différentes sont déjà sélectionnées.'
      }
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

export const AvecOptionsDésactivées = {
  args: {
    label: 'Paramètres (max 2 unités)',
    hint: 'Les options incompatibles sont grisées et expliquées au survol.',
    placeholder: 'Sélectionnez des paramètres...',
    options: restrictedOptions,
    value: ['volume-2023', 'debit-2023']
  },
  parameters: {
    docs: {
      description: {
        story: 'Illustre l\'utilisation d\'options désactivées avec une info-bulle pour expliquer la restriction d\'unités.'
      }
    }
  },
  render: args => <Wrapper {...args} />
}

const selectionOptions = [
  {
    label: 'Territoires du nord',
    options: [
      {value: 'north-a', label: 'Nord — Alpha', content: 'Nord — Alpha'},
      {value: 'north-b', label: 'Nord — Bêta', content: 'Nord — Bêta'},
      {
        value: 'north-locked', label: 'Nord — Accès conservé', content: 'Nord — Accès conservé',
        disabled: true, disabledReason: 'Ce rattachement ne peut pas être modifié.'
      }
    ]
  },
  {
    label: 'Territoires du sud',
    options: [
      {value: 'south-a', label: 'Sud — Gamma', content: 'Sud — Gamma'},
      {
        value: 'south-disabled', label: 'Sud — Indisponible', content: 'Sud — Indisponible',
        disabled: true, disabledReason: 'Ce territoire ne peut pas être sélectionné.'
      }
    ]
  }
]

const SelectionFixture = ({value = ['north-a'], ...props}) => {
  const [selected, setSelected] = useState(value)
  const [changes, setChanges] = useState(0)
  const [submissions, setSubmissions] = useState(0)

  return (
    <form
      style={{maxWidth: 480}}
      onSubmit={event => {
        event.preventDefault()
        setSubmissions(current => current + 1)
      }}
    >
      <button type='button' className='fr-btn fr-btn--secondary fr-btn--sm'>Avant le sélecteur</button>
      <div style={{minHeight: 520, marginTop: 16}}>
        <GroupedMultiselect
          {...props}
          value={selected}
          onChange={next => {
            setSelected(next)
            setChanges(current => current + 1)
          }}
        />
      </div>
      <button type='button' className='fr-btn fr-btn--secondary fr-btn--sm'>Après le sélecteur</button>
      <p className='fr-mt-2w fr-mb-0'>Nombre de changements appliqués : <span aria-label='Nombre de changements appliqués'>{changes}</span></p>
      <pre aria-label='Sélection appliquée' style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{JSON.stringify(selected)}</pre>
      <p>Soumissions du formulaire : <span aria-label='Soumissions du formulaire'>{submissions}</span></p>
    </form>
  )
}

const selectionArgs = {
  label: 'Territoires de démonstration',
  placeholder: 'Choisissez des territoires',
  options: selectionOptions,
  searchable: true,
  value: ['north-a']
}

export const SelectionImmediate = {
  name: 'Sélection immédiate',
  args: selectionArgs,
  render: args => <SelectionFixture {...args} />
}

export const SelectionAvecValidation = {
  name: 'Sélection avec validation',
  args: {
    ...selectionArgs,
    confirmSelection: true,
    showSelectionActions: true,
    minSelected: 1,
    minSelectionMessage: 'Sélectionnez au moins un territoire.'
  },
  render: args => <SelectionFixture {...args} />
}

export const SelectionAvecOptionsProtegees = {
  name: 'Sélection avec options protégées',
  args: {
    ...selectionArgs,
    value: ['north-a', 'south-a', 'north-locked'],
    confirmSelection: true,
    showSelectionActions: true,
    minSelected: 1
  },
  render: args => <SelectionFixture {...args} />
}

export const SelectionMinimumParDefaut = {
  name: 'Minimum de sélection : message par défaut',
  args: {
    ...selectionArgs,
    confirmSelection: true,
    showSelectionActions: true,
    minSelected: 1
  },
  render: args => <SelectionFixture {...args} />
}

const manySelectionOptions = Array.from({length: 150}, (_, index) => {
  const number = String(index + 1).padStart(3, '0')
  return {value: `zone-${number}`, label: `Zone ${number}`, content: `Zone ${number}`}
})

export const SelectionNombreusesZones = {
  name: 'Sélection parmi 150 zones',
  args: {
    ...selectionArgs,
    options: [{label: 'Zones disponibles', options: manySelectionOptions}],
    value: manySelectionOptions.map(option => option.value),
    confirmSelection: true,
    showSelectionActions: true,
    minSelected: 1,
    minSelectionMessage: 'Sélectionnez au moins un territoire.'
  },
  render: args => <SelectionFixture {...args} />
}
