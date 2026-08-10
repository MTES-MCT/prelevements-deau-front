export const ADMIN_NAVIGATION_ITEMS = Object.freeze([
  {
    key: 'overview',
    label: 'Vue d’ensemble',
    shortLabel: 'Administration',
    description: 'Superviser les traitements et les incidents en cours.',
    href: '/administration',
    iconClassName: 'ri-dashboard-line'
  },
  {
    key: 'replayable-declarations',
    label: 'Déclarations à rejouer',
    description: 'Analyser et relancer les dépôts dont le traitement a échoué.',
    href: '/declarations/a-rejouer',
    iconClassName: 'ri-restart-line'
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'Contrôler les rappels, relances et erreurs d’envoi.',
    href: '/notifications-declarations',
    iconClassName: 'ri-notification-3-line'
  },
  {
    key: 'declaration-types',
    label: 'Types de déclaration',
    description: 'Gérer les formats de déclaration disponibles.',
    href: '/types-declaration',
    iconClassName: 'ri-file-settings-line'
  },
  {
    key: 'service-accounts',
    label: 'Comptes de service',
    description: 'Administrer les accès techniques et leurs identifiants.',
    href: '/comptes-service',
    iconClassName: 'ri-key-2-line'
  },
  {
    key: 'audit-log',
    label: 'Journal d’audit',
    description: 'Consulter les actions sensibles réalisées sur la plateforme.',
    href: '/administration/journal-audit',
    iconClassName: 'ri-shield-check-line'
  }
])

export function isAdminNavigationPath(pathname = '') {
  return ADMIN_NAVIGATION_ITEMS.some(item =>
    pathname === item.href || pathname.startsWith(`${item.href}/`))
}

export function getActiveAdminNavigationItem(pathname = '') {
  const exactMatch = ADMIN_NAVIGATION_ITEMS.find(item => pathname === item.href)

  if (exactMatch) {
    return exactMatch
  }

  return [...ADMIN_NAVIGATION_ITEMS]
    .sort((left, right) => right.href.length - left.href.length)
    .find(item => pathname.startsWith(`${item.href}/`)) ?? null
}
