const fallbackDeclarationTypeLabels = {
  reunion_camion_citerne: 'Camion citerne',
  reunion_multi_param: 'Suivi des prélèvements et de la qualité',
  'reunion-camion-citerne': 'Camion citerne',
  'reunion-multi-param': 'Suivi des prélèvements et de la qualité',
  'aep-zre': 'AEP ou en ZRE',
  'icpe-hors-zre': 'ICPE hors ZRE',
  'camion-citerne': 'Camion citerne',
  'quick-declaration': 'Saisie rapide',
  'template-file': 'Modèle de déclaration de volumes',
  'extract-aquasys': 'Extraction Aquasys',
  gidaf: 'Extraction Gidaf',
  unknown: 'Autre'
}

export function getDeclarationTypeLabel(code, declarationType) {
  if (declarationType?.name) {
    return declarationType.name
  }

  const normalizedCode = String(code ?? '').trim().toLocaleLowerCase('fr-FR')

  if (normalizedCode && fallbackDeclarationTypeLabels[normalizedCode]) {
    return fallbackDeclarationTypeLabels[normalizedCode]
  }

  return normalizedCode || fallbackDeclarationTypeLabels.unknown
}
