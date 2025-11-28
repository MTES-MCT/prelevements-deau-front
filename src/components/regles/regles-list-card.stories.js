/* eslint-disable camelcase */
import ReglesListCard from './regles-list-card.js'

// Helper to generate dates relative to today
const today = new Date()
const daysAgo = days => {
  const date = new Date(today)
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

const daysFromNow = days => {
  const date = new Date(today)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

// Period dates (year 0001 for month/day only format)
const periodDate = (month, day) => `0001-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

// Mock data for different rule statuses
const activeRule = {
  _id: 'active-1',
  parametre: 'Volume annuel',
  contrainte: 'maximum',
  valeur: 50_000,
  unite: 'm³',
  debut_validite: daysAgo(365),
  fin_validite: null,
  debut_periode: null,
  fin_periode: null,
  remarque: 'Règle active sans limite de fin',
  exploitations: [{_id: 'exp-1'}, {_id: 'exp-2'}],
  document: {
    nature: 'Arrêté préfectoral',
    reference: 'AP-2024-001',
    date_signature: daysAgo(400),
    downloadUrl: '#'
  }
}

const activeSeasonalRuleInSeason = {
  _id: 'seasonal-in-1',
  parametre: 'Débit prélevé',
  contrainte: 'maximum',
  valeur: 150,
  unite: 'm³/h',
  debut_validite: daysAgo(365),
  fin_validite: null,
  // Current month is in season
  debut_periode: periodDate(today.getMonth(), 1), // Start of current month
  fin_periode: periodDate(today.getMonth() + 2, 28), // End of month after next
  remarque: 'Règle saisonnière active (période en cours)',
  exploitations: [{_id: 'exp-1'}],
  document: null
}

const horsSaisonRule = {
  _id: 'hors-saison-1',
  parametre: 'Volume mensuel',
  contrainte: 'maximum',
  valeur: 5000,
  unite: 'm³',
  debut_validite: daysAgo(365),
  fin_validite: null,
  // Seasonal period that is NOT current
  debut_periode: periodDate(((today.getMonth() + 6) % 12) + 1, 1), // 6 months from now
  fin_periode: periodDate(((today.getMonth() + 8) % 12) + 1, 28),
  remarque: 'Règle saisonnière hors période actuellement',
  exploitations: [{_id: 'exp-1'}, {_id: 'exp-2'}, {_id: 'exp-3'}],
  document: {
    nature: 'Convention',
    reference: 'CONV-2023-042',
    date_signature: daysAgo(500),
    downloadUrl: '#'
  }
}

const aVenirRule = {
  _id: 'a-venir-1',
  parametre: 'Volume journalier',
  contrainte: 'maximum',
  valeur: 200,
  unite: 'm³',
  debut_validite: daysFromNow(30), // Starts in 30 days
  fin_validite: null,
  debut_periode: null,
  fin_periode: null,
  remarque: 'Nouvelle règle entrant en vigueur le mois prochain',
  exploitations: [{_id: 'exp-1'}],
  document: {
    nature: 'Arrêté préfectoral',
    reference: 'AP-2025-001',
    date_signature: daysAgo(10),
    downloadUrl: '#'
  }
}

const obsoleteRule = {
  _id: 'obsolete-1',
  parametre: 'Volume annuel',
  contrainte: 'maximum',
  valeur: 75_000,
  unite: 'm³',
  debut_validite: daysAgo(1000),
  fin_validite: daysAgo(100), // Ended 100 days ago
  debut_periode: null,
  fin_periode: null,
  remarque: 'Ancienne règle remplacée par une nouvelle',
  exploitations: [{_id: 'exp-1'}, {_id: 'exp-2'}],
  document: {
    nature: 'Arrêté préfectoral',
    reference: 'AP-2020-005',
    date_signature: daysAgo(1100),
    downloadUrl: '#'
  }
}

const obsoleteSeasonalRule = {
  _id: 'obsolete-2',
  parametre: 'Niveau piézométrique',
  contrainte: 'minimum',
  valeur: -15,
  unite: 'm NGF',
  debut_validite: daysAgo(800),
  fin_validite: daysAgo(50),
  debut_periode: periodDate(6, 1),
  fin_periode: periodDate(9, 30),
  remarque: 'Ancienne règle saisonnière obsolète',
  exploitations: [{_id: 'exp-1'}],
  document: null
}

const allRulesUnsorted = [
  obsoleteRule,
  aVenirRule,
  horsSaisonRule,
  activeRule,
  obsoleteSeasonalRule,
  activeSeasonalRuleInSeason
]

const meta = {
  title: 'Components/ReglesListCard',
  component: ReglesListCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `Composant affichant la liste des règles d'un préleveur avec distinction visuelle des différents statuts :
        
- **Active** : règle actuellement en vigueur (pas de badge)
- **Hors saison** : règle active mais hors période saisonnière (badge bleu)
- **À venir** : règle dont la date de début de validité n'est pas encore atteinte (badge violet)
- **Obsolète** : règle dont la date de fin de validité est dépassée (badge gris + style atténué)

Les règles sont automatiquement triées : actives → hors saison → à venir → obsolètes.`
      }
    }
  },
  argTypes: {
    regles: {
      control: 'object',
      description: 'Liste des règles à afficher'
    },
    preleveurId: {
      control: 'text',
      description: 'ID du préleveur (utilisé pour les liens)'
    },
    hasExploitations: {
      control: 'boolean',
      description: 'Indique si le préleveur a des exploitations (affiche le bouton d\'ajout si true)'
    }
  },
  decorators: [
    Story => (
      <div style={{maxWidth: 800, margin: '0 auto'}}>
        <Story />
      </div>
    )
  ]
}

export default meta

export const TousLesStatuts = {
  args: {
    regles: allRulesUnsorted,
    preleveurId: 'prev-123',
    hasExploitations: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Affiche toutes les règles avec les 4 statuts différents. Notez que les règles sont automatiquement triées par statut.'
      }
    }
  }
}

export const ReglesActives = {
  args: {
    regles: [activeRule, activeSeasonalRuleInSeason],
    preleveurId: 'prev-123',
    hasExploitations: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Règles actuellement actives, avec et sans période saisonnière.'
      }
    }
  }
}

export const RegleHorsSaison = {
  args: {
    regles: [horsSaisonRule],
    preleveurId: 'prev-123',
    hasExploitations: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Règle active mais dont la période saisonnière n\'est pas en cours. Affiche le badge "Hors saison".'
      }
    }
  }
}

export const RegleAVenir = {
  args: {
    regles: [aVenirRule],
    preleveurId: 'prev-123',
    hasExploitations: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Règle dont la date de début de validité n\'est pas encore atteinte. Affiche le badge "À venir".'
      }
    }
  }
}

export const ReglesObsoletes = {
  args: {
    regles: [obsoleteRule, obsoleteSeasonalRule],
    preleveurId: 'prev-123',
    hasExploitations: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Règles dont la date de fin de validité est dépassée. Style atténué avec badge "Obsolète".'
      }
    }
  }
}

export const ListeVide = {
  args: {
    regles: [],
    preleveurId: 'prev-123',
    hasExploitations: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Affichage quand aucune règle n\'est définie pour le préleveur.'
      }
    }
  }
}

export const SansExploitations = {
  args: {
    regles: [],
    preleveurId: 'prev-123',
    hasExploitations: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Affichage quand le préleveur n\'a pas encore d\'exploitation. Le bouton d\'ajout est masqué et un message informatif est affiché.'
      }
    }
  }
}

export const AvecDocuments = {
  args: {
    regles: [activeRule, aVenirRule],
    preleveurId: 'prev-123',
    hasExploitations: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Règles avec documents associés. Le lien vers le document est cliquable dans les détails.'
      }
    }
  }
}

export const SansDocuments = {
  args: {
    regles: [activeSeasonalRuleInSeason, obsoleteSeasonalRule],
    preleveurId: 'prev-123',
    hasExploitations: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Règles sans document associé. Le champ Document affiche "-".'
      }
    }
  }
}

export const ParametresDifferents = {
  args: {
    regles: [
      {
        ...activeRule,
        parametre: 'Volume annuel',
        valeur: 50_000,
        unite: 'm³'
      },
      {
        ...activeRule,
        _id: 'p2',
        parametre: 'Débit prélevé',
        valeur: 120,
        unite: 'm³/h'
      },
      {
        ...activeRule,
        _id: 'p3',
        parametre: 'Niveau piézométrique',
        valeur: -10,
        unite: 'm NGF',
        contrainte: 'minimum'
      },
      {
        ...activeRule,
        _id: 'p4',
        parametre: 'Température',
        valeur: 25,
        unite: '°C'
      },
      {
        ...activeRule,
        _id: 'p5',
        parametre: 'Conductivité électrique',
        valeur: 500,
        unite: 'µS/cm'
      },
      {
        ...activeRule,
        _id: 'p6',
        parametre: 'Chlorures',
        valeur: 100,
        unite: 'mg/L'
      }
    ],
    preleveurId: 'prev-123',
    hasExploitations: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Exemples de règles pour différents paramètres avec leurs icônes respectives.'
      }
    }
  }
}
