import TimeSeriesChart from './index.js'

const meta = {
  title: 'Components/TimeSeriesChart',
  component: TimeSeriesChart,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Graphique de lignes multi-séries basé sur MUI X LineChart avec gestion des seuils statiques/dynamiques, coloration conditionnelle et annotations.'
      }
    }
  }
}

export default meta

const start = new Date('2024-01-01T00:00:00Z').getTime()
const hour = 1000 * 60 * 60

// Fonction utilitaire pour construire une série avec des données synthétiques
const buildSerie = ({id, label, axis, color, base, amplitude, threshold, withMeta = false}) => {
  const data = Array.from({length: 24}, (_, index) => {
    const timestamp = start + (index * hour)
    const meta = withMeta && index % 6 === 0 ? {
      comment: `Observation n°${((index / 6) + 1)}`,
      tags: index % 12 === 0 ? ['alerte'] : ['info'],
      alert: index % 12 === 0 ? 'Critical threshold exceeded' : undefined
    } : undefined

    return {
      x: new Date(timestamp),
      y: base + (Math.sin(index / 3) * amplitude) + (index % 5 === 0 ? (amplitude * 0.4) : 0),
      meta
    }
  })

  return {
    id,
    label,
    axis,
    color,
    data,
    threshold
  }
}

const dynamicThreshold = Array.from({length: 24}, (_, index) => ({
  x: new Date(start + (index * hour)),
  y: 55 + ((index % 8) * 1.5)
}))

export const MultiSeries = {
  args: {
    locale: 'fr-FR',
    series: [
      buildSerie({
        id: 'temperature',
        label: 'Température (°C)',
        axis: 'left',
        color: '#2563eb',
        base: 18,
        amplitude: 3,
        threshold: 20,
        withMeta: true
      }),
      buildSerie({
        id: 'consommation',
        label: 'Consommation (m³/h)',
        axis: 'right',
        color: '#16a34a',
        base: 48,
        amplitude: 6,
        threshold: dynamicThreshold,
        withMeta: false
      })
    ]
  }
}

export const DualAxes = {
  parameters: {
    docs: {
      description: {
        story: 'Deux séries illustrant l’utilisation conjointe des axes gauche (°C) et droit (m³/h) avec des seuils distincts.'
      }
    }
  },
  args: {
    locale: 'fr-FR',
    series: [
      buildSerie({
        id: 'left-axis',
        label: 'Température moyenne (°C)',
        axis: 'left',
        color: '#f97316',
        base: 17,
        amplitude: 4,
        threshold: 19,
        withMeta: true
      }),
      buildSerie({
        id: 'right-axis',
        label: 'Débit (m³/h)',
        axis: 'right',
        color: '#0ea5e9',
        base: 60,
        amplitude: 8,
        threshold: 65
      })
    ]
  }
}

export const EmptyState = {
  parameters: {
    docs: {
      description: {
        story: 'Affichage de l’état "aucune donnée" lorsque les séries sont vides.'
      }
    }
  },
  args: {
    series: [],
    locale: 'fr-FR'
  }
}

// Variations de seuil
export const StaticThreshold = {
  parameters: {
    docs: {
      description: {
        story: 'Série unique avec seuil statique. Les segments au-dessus du seuil sont mis en évidence différemment.'
      }
    }
  },
  args: {
    locale: 'fr-FR',
    series: [
      buildSerie({
        id: 'niveau',
        label: 'Niveau de la nappe (m NGF)',
        axis: 'left',
        color: '#6e445a',
        base: 45,
        amplitude: 5,
        threshold: 47,
        withMeta: false
      })
    ]
  }
}

export const DynamicThreshold = {
  parameters: {
    docs: {
      description: {
        story: 'Seuil dynamique variant dans le temps. Le seuil s’adapte à chaque instant.'
      }
    }
  },
  args: {
    locale: 'fr-FR',
    series: [
      {
        id: 'debit',
        label: 'Débit (m³/h)',
        axis: 'left',
        color: '#0078f3',
        data: Array.from({length: 48}, (_, index) => ({
          x: new Date(start + (index * hour / 2)),
          y: 50 + (Math.sin(index / 6) * 8) + (Math.random() * 3)
        })),
        threshold: Array.from({length: 48}, (_, index) => ({
          x: new Date(start + (index * hour / 2)),
          y: 52 + (Math.cos(index / 8) * 5)
        }))
      }
    ]
  }
}

// Métadonnées et interactions
export const WithMetadataAndAlerts = {
  parameters: {
    docs: {
      description: {
        story: 'Points avec métadonnées (commentaires, étiquettes) et alertes. Cliquez sur les points annotés pour voir les détails.'
      }
    }
  },
  args: {
    locale: 'fr-FR',
    series: [
      {
        id: 'temperature',
        label: 'Température eau (°C)',
        axis: 'left',
        color: '#f59e0b',
        data: Array.from({length: 24}, (_, index) => {
          const y = 15 + (Math.sin(index / 4) * 5)
          let meta

          switch (index) {
            case 6: {
              meta = {
                comment: 'Pic matinal observé',
                tags: ['mesuré', 'validé']
              }

              break
            }

            case 12: {
              meta = {
                comment: 'Température anormalement élevée',
                tags: ['alerte', 'anomalie'],
                alert: 'Abnormally high temperature detected'
              }

              break
            }

            case 18: {
              meta = {
                comment: 'Retour à la normale',
                tags: ['mesuré']
              }

              break
            }
          // No default
          }

          return {
            x: new Date(start + (index * hour)),
            y,
            meta
          }
        }),
        threshold: 18
      }
    ],
    onPointClick(seriesId, point) {
      console.log('Point cliqué :', {
        seriesId, date: point.x, value: point.y, meta: point.meta
      })
    }
  }
}

export const InteractiveDemo = {
  parameters: {
    docs: {
      description: {
        story: 'Démo interactive : cliquez sur les points annotés pour afficher les détails (voir console).'
      }
    }
  },
  args: {
    locale: 'fr-FR',
    series: [
      {
        id: 'interactive',
        label: 'Série interactive (cliquez sur les points)',
        axis: 'left',
        color: '#8b5cf6',
        data: Array.from({length: 24}, (_, index) => ({
          x: new Date(start + (index * hour)),
          y: 50 + (Math.sin(index / 3) * 10),
          meta: index % 4 === 0 ? {
            comment: `Point ${index} : ${(50 + (Math.sin(index / 3) * 10)).toFixed(1)} unités`,
            tags: ['mesure', index % 8 === 0 ? 'important' : 'normal'],
            alert: index % 8 === 0 ? 'Important threshold reached' : undefined
          } : undefined
        })),
        threshold: 52
      }
    ],
    onPointClick(seriesId, point) {
      console.log('Point cliqué :', {
        seriesId, date: point.x, value: point.y, meta: point.meta
      })
    }
  }
}

// Configurations multi-séries
export const MultipleSeriesSameAxis = {
  parameters: {
    docs: {
      description: {
        story: 'Plusieurs séries partageant le même axe Y (comparaison de capteurs).'
      }
    }
  },
  args: {
    locale: 'fr-FR',
    series: [
      {
        id: 'capteur1',
        label: 'Capteur A (m³/h)',
        axis: 'left',
        color: '#2563eb',
        data: Array.from({length: 24}, (_, index) => ({
          x: new Date(start + (index * hour)),
          y: 50 + (Math.sin(index / 3) * 8)
        })),
        threshold: 55
      },
      {
        id: 'capteur2',
        label: 'Capteur B (m³/h)',
        axis: 'left',
        color: '#16a34a',
        data: Array.from({length: 24}, (_, index) => ({
          x: new Date(start + (index * hour)),
          y: 52 + (Math.cos(index / 4) * 6)
        })),
        threshold: 55
      },
      {
        id: 'capteur3',
        label: 'Capteur C (m³/h)',
        axis: 'left',
        color: '#7c3aed',
        data: Array.from({length: 24}, (_, index) => ({
          x: new Date(start + (index * hour)),
          y: 48 + (Math.sin(index / 2) * 7)
        })),
        threshold: 55
      }
    ]
  }
}

// Cas limites
export const WithMissingData = {
  parameters: {
    docs: {
      description: {
        story: 'Données avec valeurs manquantes (null). Le graphique interpole visuellement entre les points.'
      }
    }
  },
  args: {
    locale: 'fr-FR',
    series: [
      {
        id: 'incomplete',
        label: 'Données incomplètes (m³/h)',
        axis: 'left',
        color: '#8b5cf6',
        data: Array.from({length: 24}, (_, index) => ({
          x: new Date(start + (index * hour)),
          y: [5, 6, 7, 15, 16].includes(index) ? null : 50 + (Math.sin(index / 3) * 10)
        })),
        threshold: 52
      }
    ]
  }
}

export const HighFrequencyData = {
  parameters: {
    docs: {
      description: {
        story: 'Données haute fréquence (1 point toutes les 5 minutes). Le graphique décime automatiquement pour optimiser les performances.'
      }
    }
  },
  args: {
    locale: 'fr-FR',
    series: [
      {
        id: 'highfreq',
        label: 'Mesures 5 min (L/s)',
        axis: 'left',
        color: '#0891b2',
        data: Array.from({length: 288}, (_, index) => ({
          x: new Date(start + (index * 5 * 60 * 1000)),
          y: 30 + (Math.sin(index / 20) * 5) + (Math.random() * 2)
        })),
        threshold: 32
      }
    ]
  }
}

export const ExtremeValues = {
  parameters: {
    docs: {
      description: {
        story: 'Gestion de valeurs extrêmes et d’intervalles très larges.'
      }
    }
  },
  args: {
    locale: 'fr-FR',
    series: [
      {
        id: 'small',
        label: 'Petites valeurs (0-10)',
        axis: 'left',
        color: '#2563eb',
        data: Array.from({length: 24}, (_, index) => ({
          x: new Date(start + (index * hour)),
          y: 5 + (Math.sin(index / 3) * 3)
        })),
        threshold: 6
      },
      {
        id: 'large',
        label: 'Grandes valeurs (1000-2000)',
        axis: 'right',
        color: '#0f766e',
        data: Array.from({length: 24}, (_, index) => ({
          x: new Date(start + (index * hour)),
          y: 1500 + (Math.cos(index / 4) * 300)
        })),
        threshold: 1600
      }
    ]
  }
}

// Exemples réalistes
export const WaterMonitoringExample = {
  parameters: {
    docs: {
      description: {
        story: 'Exemple réaliste : suivi des prélèvements d’eau avec débit et température.'
      }
    }
  },
  args: {
    locale: 'fr-FR',
    series: [
      {
        id: 'debit',
        label: 'Débit prélevé (m³/h)',
        axis: 'left',
        color: '#0078f3',
        data: Array.from({length: 48}, (_, index) => {
          const hourOfDay = index % 24
          const baseFlow = hourOfDay >= 6 && hourOfDay <= 22 ? 45 : 15
          const variation = (Math.sin(index / 4) * 8)

          return {
            x: new Date(start + (index * hour)),
            y: baseFlow + variation + (Math.random() * 3),
            meta: hourOfDay === 14 && index < 24 ? {
              comment: 'Pic de consommation journalier',
              tags: ['normal']
            } : undefined
          }
        }),
        threshold: 50
      },
      {
        id: 'temperature',
        label: 'Température eau (°C)',
        axis: 'right',
        color: '#f97316',
        data: Array.from({length: 48}, (_, index) => {
          const hourOfDay = index % 24
          const baseTemp = 12 + (hourOfDay >= 12 && hourOfDay <= 18 ? 3 : 0)

          return {
            x: new Date(start + (index * hour)),
            y: baseTemp + (Math.sin(index / 6) * 2),
            meta: hourOfDay === 16 && Math.floor(index / 24) === 1 ? {
              comment: 'Température maximale atteinte',
              tags: ['mesuré'],
              alert: 'Maximum temperature threshold reached'
            } : undefined
          }
        }),
        threshold: 15
      }
    ]
  }
}

export const ComplexScenario = {
  parameters: {
    docs: {
      description: {
        story: 'Scénario complexe combinant toutes les fonctionnalités : axes doublés, seuils dynamiques, métadonnées, alertes, données manquantes.'
      }
    }
  },
  args: {
    locale: 'fr-FR',
    series: [
      {
        id: 'prelevement',
        label: 'Prélèvement (m³/h)',
        axis: 'left',
        color: '#0078f3',
        data: Array.from({length: 48}, (_, index) => {
          const value = index === 12 || index === 30 ? null : 45 + (Math.sin(index / 5) * 12)
          let meta

          switch (index) {
            case 8: {
              meta = {comment: 'Début de journée', tags: ['contrôle']}

              break
            }

            case 24: {
              meta = {comment: 'Pic journalier dépassé', tags: ['alerte'], alert: 'Daily peak threshold exceeded'}

              break
            }

            case 36: {
              meta = {comment: 'Retour à la normale', tags: ['info']}

              break
            }
          // No default
          }

          return {
            x: new Date(start + (index * hour / 2)),
            y: value,
            meta
          }
        }),
        threshold: Array.from({length: 48}, (_, index) => ({
          x: new Date(start + (index * hour / 2)),
          y: 48 + (Math.cos(index / 10) * 6)
        }))
      },
      {
        id: 'temperature',
        label: 'Température (°C)',
        axis: 'right',
        color: '#f97316',
        data: Array.from({length: 48}, (_, index) => ({
          x: new Date(start + (index * hour / 2)),
          y: 14 + (Math.sin(index / 8) * 4) + (index % 10 === 0 ? 1 : 0),
          meta: index === 20 ? {
            comment: 'Température maximale',
            tags: ['mesuré', 'validé']
          } : undefined
        })),
        threshold: 17
      },
      {
        id: 'niveau',
        label: 'Niveau nappe (m NGF)',
        axis: 'right',
        color: '#6e445a',
        data: Array.from({length: 48}, (_, index) => ({
          x: new Date(start + (index * hour / 2)),
          y: 42 + (Math.cos(index / 6) * 3)
        })),
        threshold: 43
      }
    ],
    onPointClick(seriesId, point) {
      console.log('Point cliqué :', seriesId, point)
    }
  }
}

// Paramètres régionaux
export const FrenchLocale = {
  parameters: {
    docs: {
      description: {
        story: 'Formatage français des dates et des nombres.'
      }
    }
  },
  args: {
    locale: 'fr-FR',
    series: [
      buildSerie({
        id: 'data',
        label: 'Données (unité)',
        axis: 'left',
        color: '#0891b2',
        base: 1234.567,
        amplitude: 123.456,
        threshold: 1300
      })
    ]
  }
}

export const EnglishLocale = {
  parameters: {
    docs: {
      description: {
        story: 'Formatage anglais des dates et des nombres.'
      }
    }
  },
  args: {
    locale: 'en-US',
    series: [
      buildSerie({
        id: 'data',
        label: 'Données (unité)',
        axis: 'left',
        color: '#0891b2',
        base: 1234.567,
        amplitude: 123.456,
        threshold: 1300
      })
    ]
  }
}
