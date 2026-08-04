import planIGN from './styles/plan-ign.json'

const styleLoaders = {
  async photo() {
    const importedStyle = await import('./styles/photo.json')
    return importedStyle.default
  },
  'plan-ign'() {
    return Promise.resolve(planIGN)
  },
  async vector() {
    const importedStyle = await import('./styles/vector.json')
    return importedStyle.default
  },
  async 'vector-ign'() {
    const importedStyle = await import('./styles/vector-ign.json')
    return importedStyle.default
  }
}

export const getInitialMapStyle = style => style === 'plan-ign'
  ? {name: style, definition: planIGN}
  : null

export const loadMapStyle = async style => {
  const loader = styleLoaders[style] ?? styleLoaders['plan-ign']

  return {
    name: style,
    definition: await loader()
  }
}
