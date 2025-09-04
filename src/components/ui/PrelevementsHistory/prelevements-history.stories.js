import dataTest from './data-test.json'

import PrelevementsHistory from './index.js'

const meta = {
  title: 'Components/PrelevementsHistory',
  component: PrelevementsHistory,
  tags: ['autodocs'],
  argTypes: {
    dailyItems: {
      control: 'object',
      description: 'Liste des paramètres journaliers à afficher sous forme de tags.'
    },
    intervalItems: {
      control: 'object',
      description: 'Liste des paramètres à intervalle 15 min à afficher sous forme de tags.'
    },
    dailyAlert: {
      control: 'text',
      description: 'Message d’alerte à afficher au niveau des paramètres journaliers.'
    },
    dateAlert: {
      control: 'text',
      description: 'Message d’alerte à afficher au niveau du calendrier.'
    },
    calendarData: {
      control: 'object',
      description: 'Données du calendrier des prélèvements (dates, valeurs, etc.).'
    },
    chartData: {
      control: 'object',
      description: 'Données pour le graphique de tendance des paramètres.'
    },
    connectNulls: {
      control: 'boolean',
      description: 'Relie les points manquants dans le graphique de tendance.'
    }
  },
  args: {
    dailyItems: dataTest.dailyItems,
    intervalItems: dataTest.intervalItems,
    dailyAlert: null,
    dateAlert: null,
    calendarData: dataTest.datesData,
    chartData: dataTest.datesData,
    connectNulls: true
  }
}

const renderPrelevementsHistory = args => <PrelevementsHistory {...args} />

export default meta

export const Default = {render: renderPrelevementsHistory}

export const DaysOnly = {
  args: {
    calendarData: dataTest.datesWithoutIntervals,
    chartData: dataTest.datesWithoutIntervals,
    intervalItems: null
  },
  render: renderPrelevementsHistory
}

export const WithAlerts = {
  args: {
    dailyItems: null,
    intervalItems: [],
    dailyAlert: 'Aucun paramètre journalier disponible',
    dateAlert: 'Attention, certaines dates sont manquantes',
    calendarData: dataTest.datesData,
    chartData: dataTest.datesData,
    connectNulls: false
  },
  render: renderPrelevementsHistory
}

export const withoutData = {
  args: {
    dailyItems: null,
    intervalItems: [],
    dailyAlert: null,
    dateAlert: null,
    calendarData: null,
    chartData: null,
    connectNulls: false
  },
  render: renderPrelevementsHistory
}
