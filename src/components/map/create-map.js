export const MAP_UNAVAILABLE_MESSAGE = 'La carte ne peut pas s’afficher sur ce navigateur. Vous pouvez continuer à consulter la liste ou à remplir le formulaire.'

// MapLibre 6 requires WebGL 2 and throws this structured error before adding
// event listeners or requesting tiles. Keep the rest of the page usable.
export function createMap(maplibre, options) {
  maplibre.setWorkerUrl(`/maplibre/${maplibre.getVersion()}/maplibre-gl-worker.mjs`)
  const {container} = options
  container.querySelector('[data-map-unavailable]')?.remove()
  try {
    return new maplibre.Map(options)
  } catch (error) {
    if (error.name !== 'GPUInitializationError') {
      throw error
    }

    const message = container.ownerDocument.createElement('div')
    message.dataset.mapUnavailable = ''
    message.setAttribute('role', 'status')
    message.className = 'flex h-full w-full items-center justify-center bg-gray-100 p-6 text-center text-sm text-gray-600'
    message.textContent = MAP_UNAVAILABLE_MESSAGE
    container.replaceChildren(message)
    return null
  }
}
