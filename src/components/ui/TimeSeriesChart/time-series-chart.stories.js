import TimeSeriesChart from './index.js'

const meta = {
  title: 'Components/TimeSeriesChart',
  component: TimeSeriesChart,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Graphique de séries temporelles avancé avec support multi-axes, types mixtes (ligne/barre), seuils, et annotations.'
      }
    }
  },
  args: {
    // Default frequency for all stories (1 hour intervals)
    frequency: '1 hour',
    locale: 'fr-FR'
  }
}

export default meta

const start = new Date('2024-01-01T00:00:00Z').getTime()
const hour = 1000 * 60 * 60
const day = 24 * hour

// Helper to generate data
const generateData = (count, interval, generator) =>
  Array.from({length: count}, (_, i) => ({
    x: new Date(start + (i * interval)),
    ...generator(i)
  }))

export const Default = {
  args: {
    series: [{
      id: 'temp',
      label: 'Température (°C)',
      axis: 'left',
      color: '#2563eb',
      data: generateData(24, hour, i => ({y: 20 + (Math.sin(i / 4) * 5)}))
    }]
  }
}

export const MixedTypesAndAxes = {
  parameters: {
    docs: {description: {story: 'Séries sur deux axes Y différents.'}}
  },
  args: {
    series: [
      {
        id: 'temp',
        label: 'Température (°C)',
        axis: 'left',
        color: '#f97316',
        data: generateData(24, hour, i => ({y: 20 + (Math.sin(i / 4) * 5)}))
      },
      {
        id: 'rain',
        label: 'Pluie (mm)',
        axis: 'right',
        color: '#3b82f6',
        data: generateData(24, hour, i => ({y: Math.max(0, Math.cos(i / 4) * 8)}))
      }
    ]
  }
}

export const AnnotationsAndAlerts = {
  parameters: {
    docs: {description: {story: 'Démonstration des annotations (carrés) et des segments (cercles).'}}
  },
  args: {
    series: [{
      id: 'quality',
      label: 'Qualité de l\'eau',
      axis: 'left',
      color: '#10b981',
      data: generateData(20, day, i => {
        let meta
        if (i === 5) {
          meta = {comment: 'Prélèvement de contrôle'}
        }

        if (i === 10) {
          meta = {comment: 'Pollution détectée', alert: 'Seuil critique'}
        }

        if (i === 15) {
          meta = {comment: 'Retour à la normale'}
        }

        return {
          y: 80 + ((Math.sin(i) + 1) * 10) - (i === 10 ? 40 : 0),
          meta
        }
      }),
      threshold: 60
    }],
    onPointClick: (id, point) => console.log(`Point cliqué: ${point.x.toLocaleDateString()} - ${point.meta?.comment || ''}`)
  }
}

export const Decimation = {
  parameters: {
    docs: {description: {story: 'Décimation automatique pour les grands jeux de données (ex: 1000 points).'}}
  },
  args: {
    series: [{
      id: 'high-freq',
      label: 'Haute fréquence',
      axis: 'left',
      color: '#8b5cf6',
      data: generateData(1000, hour / 4, i => ({y: 50 + ((Math.sin(i) + 1) * 5)}))
    }]
  }
}

export const Thresholds = {
  parameters: {
    docs: {description: {story: 'Seuils statiques et dynamiques.'}}
  },
  args: {
    series: [
      {
        id: 'static',
        label: 'Seuil statique',
        axis: 'left',
        color: '#ef4444',
        data: generateData(24, hour, i => ({y: 50 + (Math.sin(i / 3) * 20)})),
        threshold: 60
      },
      {
        id: 'dynamic',
        label: 'Seuil dynamique',
        axis: 'right',
        color: '#f59e0b',
        data: generateData(24, hour, i => ({y: 30 + (Math.cos(i / 3) * 10)})),
        threshold: generateData(24, hour, i => ({y: 35 + (Math.sin(i / 6) * 5)}))
      }
    ]
  }
}
