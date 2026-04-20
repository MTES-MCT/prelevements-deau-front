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
  deletePreleveurAction,
  getPointsFromPreleveurAction,
  getExploitationFromPreleveurAction
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
  getZonesActions
} from './zones.js'
