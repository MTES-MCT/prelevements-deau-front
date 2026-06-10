// Server Actions - Centralized exports
// All server actions for API calls with NextAuth authentication
export {
  getPointsPrelevementAction,
  getPointPrelevementAction,
  createPointPrelevementAction,
  editPointPrelevementAction,
  deletePointPrelevementAction,
  getExploitationsByPointIdAction,
  getBnpeAction,
  getBssAction,
  getMesoAction,
  getMeContinentalesAction,
  getBvBdcarthageAction
} from './points-prelevement.js'

export {
  getDeclarantsAction,
  getDeclarantAction,
  createPreleveurAction,
  updatePreleveurAction,
  sendDeclarantAccountCreationNotificationAction,
  deletePreleveurAction,
  getPointsFromPreleveurAction,
  getExploitationFromPreleveurAction,
  listDeclarantEmailAliasesAction,
  createDeclarantEmailAliasAction,
  deleteDeclarantEmailAliasAction
} from './declarants.js'

export {
  getExploitationAction,
  createExploitationAction,
  updateExploitationAction,
  deleteExploitationAction,
  getExploitationDocumentsAction
} from './exploitations.js'

export {
  getDocumentsFromPreleveurAction,
  createDocumentAction,
  uploadDocumentAction,
  updateDocumentAction,
  deleteDocumentAction
} from './documents.js'

export {
  getReglesFromPreleveurAction,
  getRegleAction,
  createRegleAction,
  updateRegleAction,
  deleteRegleAction
} from './regles.js'

export {
  getSeriesMetadataAction,
  getSeriesValuesAction,
  searchSeriesAction
} from './series.js'

export {
  getStatsAction
} from './stats.js'

export {
  addDeclarantDeclarationTypeAction,
  createDeclarationTypeAction,
  disableDeclarationTypeAction,
  getDeclarantDeclarationTypesAction,
  listDeclarationTypesAction,
  removeDeclarantDeclarationTypeAction,
  restoreDeclarationTypeAction,
  updateDeclarantDeclarationTypeAction,
  updateDeclarationTypeAction
} from './declaration-types.js'

export {
  addZoneInstructorAction,
  createZoneExploitationAction,
  createZonePointPrelevementAction,
  deleteZoneExploitationAction,
  deleteZoneInstructorAction,
  deleteZonePointPrelevementAction,
  getZoneAction,
  getZoneCollecteursAction,
  getZoneDeclarantOptionsAction,
  getZoneDeclarantsAction,
  getZoneExploitationAction,
  getZoneExploitationsAction,
  getZoneGeometryAction,
  getZoneInstructorAction,
  getZoneInstructorsAction,
  getZonePointPrelevementAction,
  getZonePointsPrelevementAction,
  getZonePointsPrelevementOptionsAction,
  getZonesAction,
  getZonesActions,
  sendZoneInstructorAccountCreationNotificationAction,
  sendZoneInstructorAttachmentNotificationAction,
  updateZoneExploitationAction,
  updateZonePointPrelevementAction
} from './zones.js'
