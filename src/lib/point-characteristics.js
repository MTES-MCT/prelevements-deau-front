export const POINT_KINDS = Object.freeze({
  PHYSIQUE: 'PHYSIQUE',
  FICTIF: 'FICTIF'
})

export const pointKindLabels = Object.freeze({
  [POINT_KINDS.PHYSIQUE]: 'Physique',
  [POINT_KINDS.FICTIF]: 'Fictif'
})

export const pointKindOptions = Object.entries(pointKindLabels).map(([value, label]) => ({
  value,
  label
}))

export const pointOriginLabels = Object.freeze({
  NAPPE: 'Nappe',
  NAPPE_ACCOMPAGNEMENT: 'Nappe d’accompagnement',
  COURS_EAU: 'Cours d’eau',
  SOURCE: 'Source',
  PLAN_EAU: 'Plan d’eau'
})

export const pointOriginOptions = Object.entries(pointOriginLabels).map(([value, label]) => ({
  value,
  label
}))

export const pointWithdrawalTypeLabels = Object.freeze({
  LITTORAL: 'Littoral',
  CONTINENTAL: 'Continental',
  SOUTERRAIN: 'Souterrain',
  STOCKAGE: 'Stockage'
})

export const pointWithdrawalTypeOptions = Object.entries(pointWithdrawalTypeLabels)
  .map(([value, label]) => ({value, label}))
