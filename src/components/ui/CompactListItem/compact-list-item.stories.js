import {StarBorderOutlined} from '@mui/icons-material'

import CompactListItem from './index.js'

const meta = {
  title: 'Components/CompactListItem',
  component: CompactListItem,
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: false,
      description: 'Composant React pour les icônes SVG venant de MUI (ex: `<OilBarrelOutlinedIcon />`)',
      table: {
        type: {summary: 'React.ComponentType'},
        defaultValue: {summary: 'undefined'}
      }
    },
    iconId: {
      control: 'text',
      description: `Classe CSS pour les icônes tirées du DSFR ou de Remix Icons.

**Exemples de valeurs:**
- \`"fr-icon-edit-line"\`
- \`"fr-icon-external-link-line"\`
- \`"fr-icon-delete-bin-line"\`

**Note:** Si \`icon\` et \`iconId\` sont définis, \`icon\` sera prioritaire.`,
      table: {
        type: {summary: 'string'},
        defaultValue: {summary: 'undefined'}
      }
    },
    label: {
      description: `Label de l'élément affiché à côté de l'icône.

**Types acceptés:**
- \`string\` : texte simple
- \`React.ReactNode\` : composant React personnalisé

**Exemple:**
\`\`\`jsx
label="Nom de l'exploitation"
// ou
label={<strong>Nom important</strong>}
\`\`\``,
      control: false,
      table: {
        type: {summary: 'string | React.ReactNode'}
      }
    },
    hint: {
      control: 'text',
      description: `Ajoute une tooltip (icône d'information) au label pour afficher des informations supplémentaires.

**Exemple:**
\`\`\`jsx
hint="Cette exploitation est en cours de validation"
\`\`\``,
      table: {
        type: {summary: 'string'},
        defaultValue: {summary: 'undefined'}
      }
    },
    tags: {
      description: `Liste des tags à afficher après le label.

**Structure de chaque tag:**
\`\`\`typescript
{
  label: string | React.ReactNode,  // Contenu du tag
  severity?: 'info' | 'success' | 'warning' | 'error',  // Couleur du tag
  hasIcon?: boolean  // Affiche une icône dans le tag
}
\`\`\`

**Exemple:**
\`\`\`jsx
tags={[
  {
    label: "2 exploitations",
    severity: "info",
    hasIcon: false
  },
  {
    label: "Validé",
    severity: "success",
    hasIcon: true
  }
]}
\`\`\``,
      control: 'object',
      table: {
        type: {
          summary: 'Array<{label: string | React.ReactNode, severity?: string, hasIcon?: boolean}>'
        },
        defaultValue: {summary: 'undefined'}
      }
    },
    metas: {
      description: `Liste des métadonnées à afficher sous le label principal.

**Structure de chaque meta:**
\`\`\`typescript
{
  icon: React.ComponentType,  // Composant d'icône MUI
  content: string  // Texte de la métadonnée
}
\`\`\`

**Exemple:**
\`\`\`jsx
import {CalendarMonthOutlined, PinDropOutlined} from '@mui/icons-material'

metas={[
  {
    icon: CalendarMonthOutlined,
    content: "Créé le 27/10/2025"
  },
  {
    icon: PinDropOutlined,
    content: "Paris, France"
  }
]}
\`\`\``,
      control: 'object',
      table: {
        type: {
          summary: 'Array<{icon: React.ComponentType, content: string}>'
        },
        defaultValue: {summary: 'undefined'}
      }
    },
    actions: {
      description: `Liste des actions disponibles, affichées sous forme de boutons à droite du composant.

**Structure de chaque action:**
\`\`\`typescript
{
  title: string,  // Titre (tooltip) du bouton
  iconId: string,  // Classe d'icône DSFR/Remix
  type?: 'danger',  // Affiche le bouton en rouge si défini
  onClick: () => void  // Fonction appelée au clic
}
\`\`\`

**Exemple:**
\`\`\`jsx
actions={[
  {
    title: "Modifier",
    iconId: "fr-icon-edit-line",
    onClick: () => console.log('Édition')
  },
  {
    title: "Supprimer",
    iconId: "fr-icon-delete-bin-line",
    type: "danger",
    onClick: () => console.log('Suppression')
  }
]}
\`\`\``,
      control: 'object',
      table: {
        type: {
          summary: 'Array<{title: string, iconId: string, type?: "danger", onClick: () => void}>'
        },
        defaultValue: {summary: 'undefined'}
      }
    },
    background: {
      description: `Couleur de fond du composant.

**Valeurs possibles:**
- \`"primary"\` : fond gris clair (par défaut)
- \`"secondary"\` : fond bleu France

**Exemple:**
\`\`\`jsx
background="secondary"
\`\`\``,
      control: 'radio',
      options: ['primary', 'secondary'],
      table: {
        type: {summary: '"primary" | "secondary"'},
        defaultValue: {summary: '"primary"'}
      }
    }
  },
  args: {
    label: 'Nom de l\'élément',
    icon: StarBorderOutlined,
    metas: [
      {
        icon: StarBorderOutlined,
        content: 'Métadonnée 1'
      },
      {
        icon: StarBorderOutlined,
        content: 'Métadonnée 2'
      }
    ],
    tags: [
      {
        label: 'Tag 1',
        severity: 'info'
      }
    ],
    background: 'primary',
    hint: 'Ceci est une info supplémentaire affichée dans une tooltip',
    actions: [
      {
        title: 'Action 1',
        iconId: 'fr-icon-external-link-line',
        onClick: () => console.log('Action 1 cliquée')
      },
      {
        title: 'Action 2',
        iconId: 'fr-icon-edit-line',
        onClick: () => console.log('Action 2 cliquée')
      },
      {
        title: 'Action 3',
        iconId: 'fr-icon-delete-bin-line',
        type: 'danger',
        onClick: () => console.log('Action 3 cliquée')
      }
    ]
  }
}

export default meta

export const Défaut = {}

export const SansIcone = {
  args: {
    icon: null,
    iconId: null
  }
}

export const SansTags = {
  args: {
    tags: null
  }
}

export const SansMetas = {
  args: {
    metas: null
  }
}

export const SansActions = {
  args: {
    actions: null
  }
}
