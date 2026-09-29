export const MANAGED_RESOURCE_TYPES = [
  {value: 'SUPERFICIELLE', label: 'Eau de surface'},
  {value: 'SOUTERRAIN', label: 'Eau souterraine'},
  {value: 'TRANSITION', label: 'Eau de transition'},
  {value: 'MIXTE', label: 'Mixte (tous les types)'}
]

export function isManagedResourceType(value) {
  return MANAGED_RESOURCE_TYPES.some(option => option.value === value)
}

export function canViewSageSettings(zone) {
  return zone?.type === 'SAGE' && Boolean(zone.permissions?.includes('zone.detail.read'))
}
