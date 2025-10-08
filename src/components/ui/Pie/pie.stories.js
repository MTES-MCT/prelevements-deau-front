import Pie from './index.js'

const meta = {
  title: 'Components/Pie',
  component: Pie,
  tags: ['autodocs'],
  argTypes: {
    data: {
      control: 'object',
      description: `Tableau d'objets pour chaque secteur du camembert.

Schéma :
\`\`\`json
[
  {
    id: string|number, // Identifiant unique du secteur
    value: number,     // Valeur numérique du secteur
    label: string      // Libellé affiché pour le secteur
  }
]
\`\`\`
`
    },
    width: {
      control: 'number',
      description: 'Largeur du graphique en pixels. Type : number. (optionnel, défaut : 500)'
    },
    height: {
      control: 'number',
      description: 'Hauteur du graphique en pixels. Type : number. (optionnel, défaut : 300)'
    }
  },
  args: {
    data: [
      {id: 0, value: 10, label: 'Eau douce'},
      {id: 1, value: 20, label: 'Eau salée'},
      {id: 2, value: 15, label: 'Eau saumâtre'}
    ],
    width: 500,
    height: 300
  }
}

export default meta

export const Défaut = {}
