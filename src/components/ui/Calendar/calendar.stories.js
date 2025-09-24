import {fr} from '@codegouvfr/react-dsfr'

import Calendar from './index.js'

const meta = {
  title: 'Components/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Composant Calendar affichant une grille de cellules avec titre et support de l\'interaction.'
      }
    }
  },
  args: {}
}

export default meta

const blue = fr.colors.decisions.artwork.major.blueFrance.default
const orange = fr.colors.decisions.background.actionHigh.warning.hover
const lightBlue = fr.colors.decisions.background.actionHigh.info.hover
const gray = fr.colors.decisions.background.actionHigh.grey.active

export const ExempleAnnée = {
  parameters: {
    docs: {
      description: {
        story: 'Affichage d\'une année complète en mode compact (4 colonnes). Les cases bleues représentent des mois avec données complètes, et les oranges des mois avec données comportant une anomalie.'
      }
    }
  },
  args: {
    title: '2024',
    compactMode: true,
    cells: [
      {key: 'jan', label: 'Jan', color: blue},
      {key: 'fev', label: 'Fév', color: blue},
      {key: 'mar', label: 'Mars', color: blue},
      {key: 'avr', label: 'Avr', color: orange},
      {key: 'mai', label: 'Mai', color: orange},
      {key: 'jun', label: 'Juin', color: blue},
      {key: 'juil', label: 'Juil', color: blue},
      {key: 'aout', label: 'Août', color: blue},
      {key: 'sept', label: 'Sept', color: blue},
      {key: 'oct', label: 'Oct', color: blue},
      {key: 'nov', label: 'Nov', color: blue},
      {key: 'dec', label: 'Déc', color: blue}
    ]
  }
}

export const ExempleMois = {
  parameters: {
    docs: {
      description: {
        story: 'Illustration d\'un cas concret pour les prélèvements sur un mois. Les couleurs représentent différents statuts : prélèvement effectué (bleu), alerte (orange), pas de prélèvement (bleu clair), prélèvement manquant (gris).'
      }
    }
  },
  args: {
    title: 'Juillet',
    compactMode: false,
    cells: [
      {key: '1', label: '1', color: blue},
      {key: '2', label: '2', color: blue},
      {key: '3', label: '3', color: blue},
      {key: '4', label: '4', color: blue},
      {key: '5', label: '5', color: blue},
      {key: '6', label: '6', color: blue},
      {key: '7', label: '7', color: gray},
      {key: '8', label: '8', color: blue},
      {
        key: '9',
        label: '9',
        color: lightBlue,
        isInteractive: true
      },
      {
        key: '10',
        label: '10',
        color: lightBlue,
        isInteractive: true
      },
      {key: '11', label: '11', color: blue},
      {key: '12', label: '12', color: lightBlue},
      {key: '13', label: '13', color: blue},
      {key: '14', label: '14', color: gray},
      {key: '15', label: '15', color: orange},
      {key: '16', label: '16', color: orange},
      {key: '17', label: '17', color: orange},
      {key: '18', label: '18', color: orange},
      {key: '19', label: '19', color: blue},
      {key: '20', label: '20', color: blue},
      {key: '21', label: '21', color: gray},
      {key: '22', label: '22', color: blue},
      {key: '23', label: '23', color: blue},
      {key: '24', label: '24', color: blue},
      {key: '25', label: '25', color: lightBlue},
      {key: '26', label: '26', color: blue},
      {key: '27', label: '27', color: blue},
      {key: '28', label: '28', color: blue},
      {key: '29', label: '29', color: blue},
      {key: '30', label: '30', color: blue},
      {key: '31', label: '31', color: blue}
    ]
  }
}

export const ExemplePlusieursAnnées = {
  parameters: {
    docs: {
      description: {
        story: 'Affichage de plusieurs années en mode compact. Les cases bleues indiquent des années avec données complètes, les oranges des années avec données comportant une anomalie.'
      }
    }
  },
  args: {
    title: '2018 - 2024',
    compactMode: true,
    cells: [
      {key: '2018', label: '2018', color: blue},
      {key: '2019', label: '2019', color: blue},
      {key: '2020', label: '2020', color: blue},
      {key: '2021', label: '2021', color: blue},
      {key: '2022', label: '2022', color: blue},
      {key: '2023', label: '2023', color: orange},
      {key: '2024', label: '2024', color: orange}
    ]
  }
}

export const ExempleInteractif = {
  parameters: {
    docs: {
      description: {
        story: 'Exemple de calendrier interactif avec tooltips et gestion de clics. Survolez et cliquez sur les cases pour voir les interactions. Un icône de recherche apparaît au survol des cases interactives.'
      }
    }
  },
  args: {
    title: 'Interactions',
    compactMode: true,
    cells: [
      {
        key: 'A', label: 'A', color: blue, isInteractive: true, ariaLabel: 'Cellule A'
      },
      {
        key: 'B', label: 'B', color: orange, isInteractive: true, ariaLabel: 'Cellule B'
      },
      {
        key: 'C', label: 'C', color: blue, isInteractive: true, ariaLabel: 'Cellule C'
      },
      {
        key: 'D', label: 'D', color: orange, isInteractive: true, ariaLabel: 'Cellule D'
      }
    ],
    renderTooltipContent: cell => `Survol: ${cell.ariaLabel}`,
    onCellClick: cell => console.log(`Clique sur ${cell.ariaLabel}`)
  }
}
