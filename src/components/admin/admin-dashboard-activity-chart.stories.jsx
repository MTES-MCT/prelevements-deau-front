import AdminDashboardActivityChart from './admin-dashboard-activity-chart.js'

import {ADMIN_DASHBOARD_CHART_COLORS} from '@/lib/admin-dashboard.js'

const items = Array.from({length: 31}, (_, index) => ({
  date: new Date(Date.UTC(2026, 7, index + 1)).toISOString().slice(0, 10)
}))

export default {
  title: 'Administration/Activité des déclarations',
  component: AdminDashboardActivityChart,
  decorators: [Story => (
    <div style={{maxWidth: 1100, margin: '0 auto', padding: 16}}>
      <Story />
    </div>
  )],
  args: {
    items,
    granularity: 'day',
    series: [
      {label: 'Saisies rapides', data: items.map((_, index) => (index + 1) * 1000), color: ADMIN_DASHBOARD_CHART_COLORS.manualDeclarations, stack: 'declarations'},
      {label: 'Fichiers déposés', data: items.map((_, index) => index * 200), color: ADMIN_DASHBOARD_CHART_COLORS.spreadsheetDeclarations, stack: 'declarations'},
      {label: 'Autres dépôts', data: items.map((_, index) => index * 50), color: ADMIN_DASHBOARD_CHART_COLORS.otherDeclarations, stack: 'declarations'},
      {label: 'Échecs de traitement', data: items.map((_, index) => index * 10), color: ADMIN_DASHBOARD_CHART_COLORS.failed}
    ]
  }
}

export const Quotidienne = {}

export const Hebdomadaire = {
  args: {
    granularity: 'week',
    items: items.map((_, index) => ({date: new Date(Date.UTC(2026, 0, index * 7 + 5)).toISOString().slice(0, 10)}))
  }
}
