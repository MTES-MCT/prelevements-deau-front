import dataTest from './data-test.json'

import PrelevementsHistory from './index.js'

const meta = {
  title: 'Components/PrelevementsHistory',
  component: PrelevementsHistory,
  tags: ['autodocs'],
  argTypes: {
    dailyParametersAlert: {
      control: 'text',
      description: `Message d’alerte à afficher au niveau des **paramètres journaliers**.
Ex : absence de données ou anomalie globale.`
    },
    calendarAlert: {
      control: 'text',
      description: `Message d’alerte à afficher au niveau du **calendrier**.
Ex : dates manquantes, incohérences, problème de saisie.`
    },
    historyData: {
      control: 'object',
      description: `
Données du **calendrier des prélèvements**.

Structure attendue :

\`\`\`json
{
  "pointPrelevement": "string",
  "minDate": "YYYY-MM-DD",
  "maxDate": "YYYY-MM-DD",
  "dailyParameters": [
    {
      "paramIndex": number,
      "nom_parametre": "string",
      "type": "string",
      "unite": "string"
    }
  ],
  "fifteenMinutesParameters": [
    {
      "paramIndex": number,
      "nom_parametre": "string",
      "type": "string",
      "unite": "string"
    }
  ],
  "dailyValues": [
    {
      "date": "YYYY-MM-DD",
      "values": [number, ...],
      "fifteenMinutesValues": [
        {
          "heure": "HH:mm:ss",
          "values": [number|null, ...]
        }
      ] | null
    }
  ],
  "volumePreleveTotal": number
}
\`\`\`

**Détails des propriétés :**
- \`pointPrelevement\` : identifiant du point de prélèvement.
- \`minDate\`, \`maxDate\` : bornes de la période affichée (format "YYYY-MM-DD").
- \`dailyParameters\` : tableau d’objets décrivant chaque paramètre journalier (index, nom, type, unité).
- \`fifteenMinutesParameters\` : tableau d’objets décrivant chaque paramètre à intervalle 15 min.
- \`dailyValues\` : tableau d’objets pour chaque date.
    - \`date\` : date du prélèvement.
    - \`values\` : valeurs journalières.
    - \`fifteenMinutesValues\` : tableau d’objets pour chaque créneau de 15 min (ou null si non applicable).
        - \`heure\` : heure du créneau (format "HH:mm:ss").
        - \`values\` : valeurs pour chaque paramètre.
- \`volumePreleveTotal\` : volume total prélevé sur la période.
`
    },
    isTrendChartIgnoringNulls: {
      control: 'boolean',
      description: 'Relie les points manquants dans le graphique de tendance (`true`) ou laisse des ruptures (`false`).'
    }
  },
  args: {
    dailyParametersAlert: '',
    calendarAlert: '',
    historyData: dataTest.datesData,
    isTrendChartIgnoringNulls: true
  }
}

const renderPrelevementsHistory = args => <PrelevementsHistory {...args} />

export default meta

export const Default = {render: renderPrelevementsHistory}

export const DaysOnly = {
  args: {
    historyData: dataTest.datesWithoutIntervals
  },
  render: renderPrelevementsHistory
}

export const WithAlerts = {
  args: {
    dailyParametersAlert: 'Aucun paramètre journalier disponible',
    calendarAlert: 'Attention, certaines dates sont manquantes',
    historyData: dataTest.datesData,
    isTrendChartIgnoringNulls: false
  },
  render: renderPrelevementsHistory
}

export const withoutData = {
  args: {
    dailyParametersAlert: null,
    calendarAlert: null,
    historyData: null,
    isTrendChartIgnoringNulls: false
  },
  render: renderPrelevementsHistory
}
