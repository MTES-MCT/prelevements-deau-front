import {isAuthGuardPublicPath} from './public-paths.js'

export const PRELEVEUR_SELECTION_PATH = '/choisir-preleveur'

// Only the API's flags belong in the session, never the profile list.
export function compactPreleveurProfiles(profiles) {
  return typeof profiles?.enabled === 'boolean'
    ? {
      enabled: profiles.enabled,
      selectionRequired: profiles.selectionRequired === true,
      ...(typeof profiles.canSwitch === 'boolean' ? {canSwitch: profiles.canSwitch} : {}),
      ...(typeof profiles.canManageAccount === 'boolean' ? {canManageAccount: profiles.canManageAccount} : {})
    }
    : null
}

export function getPreleveurSelectionRedirect(pathname, profiles) {
  if (!profiles?.enabled || !profiles.selectionRequired
    || pathname === PRELEVEUR_SELECTION_PATH
    || pathname.startsWith('/api/')
    || (pathname !== '/' && isAuthGuardPublicPath(pathname))) {
    return null
  }

  return PRELEVEUR_SELECTION_PATH
}

export function getPreleveurProfileLabel(preleveur) {
  return preleveur.socialReason
    || [preleveur.firstName, preleveur.lastName].filter(Boolean).join(' ')
    || 'Préleveur'
}
