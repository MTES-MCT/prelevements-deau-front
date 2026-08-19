function getValues(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  return value ? [value] : []
}

export function getFacetedDeclarantFilterConfigs(filterConfigs = [], facets = {}) {
  return filterConfigs.filter(config => [config.name, ...(config.facetKeys || [])]
    .some(key => Object.hasOwn(facets, key)))
}

export function getActiveDeclarantFilterValueCount(filters = {}, filterConfigs = []) {
  return filterConfigs.reduce(
    (count, config) => count + getValues(filters[config.name]).length,
    0
  )
}

export function getActiveDeclarantFilterChips({
  filterConfigs = [],
  filters = {},
  optionsByFilter = {}
} = {}) {
  return filterConfigs.flatMap(config => {
    const options = [
      ...(optionsByFilter[config.name] || []),
      ...(config.options || [])
    ]

    return getValues(filters[config.name]).map(value => {
      const option = options.find(candidate => String(candidate.value) === String(value))
      const valueLabel = option?.label || String(value)

      return {
        id: `${config.name}:${value}`,
        label: `${config.label} : ${valueLabel}`,
        name: config.name,
        value: String(value)
      }
    })
  })
}

export function getDeclarantFilterRemoval(filters = {}, chip) {
  const currentValue = filters[chip.name]

  if (Array.isArray(currentValue)) {
    return {
      [chip.name]: currentValue.filter(value => String(value) !== chip.value)
    }
  }

  return {[chip.name]: null}
}
