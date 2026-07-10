function normalizeText(value) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

export function getStructureName(structure) {
  return normalizeText(
    structure?.nom_raison_sociale
    || structure?.nom_complet
    || structure?.sigle
  )
}

export function getStructureEstablishment(structure, searchTerm = '') {
  const searchedIdentifier = normalizeText(searchTerm).replaceAll(/\D/gv, '')

  if (searchedIdentifier.length === 14) {
    const matchingEstablishment = structure?.matching_etablissements?.find(
      establishment => normalizeText(establishment?.siret) === searchedIdentifier
    )

    if (matchingEstablishment) {
      return matchingEstablishment
    }
  }

  return structure?.siege || null
}

function getStreetAddress(establishment) {
  const streetAddress = [
    establishment?.numero_voie,
    establishment?.indice_repetition,
    establishment?.type_voie,
    establishment?.libelle_voie
  ]
    .map(value => normalizeText(value))
    .filter(Boolean)
    .join(' ')

  return streetAddress || normalizeText(establishment?.adresse || establishment?.geo_adresse)
}

export function structureToDeclarantPatch(structure, searchTerm = '') {
  const establishment = getStructureEstablishment(structure, searchTerm)

  return {
    socialReason: getStructureName(structure),
    siret: normalizeText(establishment?.siret),
    addressLine1: getStreetAddress(establishment),
    addressLine2: normalizeText(establishment?.complement_adresse),
    postalCode: normalizeText(establishment?.code_postal),
    city: normalizeText(establishment?.libelle_commune)
  }
}
