import {startClientSideIsDarkLogic} from '@codegouvfr/react-dsfr/useIsDark/client.js'

// Keep the runtime import across module re-evaluations, but resolve each new
// starter's readiness promise. DSFR components also consume prDsfrLoaded.
const runtimeKey = Symbol.for('partageons-leau.dsfr.runtime')
let isStarted = false
let resolveLoaded
export const prDsfrLoaded = new Promise(resolve => { resolveLoaded = resolve })

function loadRuntime(verbose) {
  if (typeof window.dsfr?.start === 'function') return Promise.resolve(window.dsfr)
  if (window[runtimeKey]) return window[runtimeKey]

  window.dsfr = {verbose, mode: 'react'}
  window[runtimeKey] = import('@codegouvfr/react-dsfr/dsfr/dsfr.module.js').then(() => {
    if (typeof window.dsfr?.start !== 'function') throw new Error('Le moteur DSFR n’a pas pu être initialisé.')
    return window.dsfr
  })
  return window[runtimeKey]
}

// Same hydration/theme contract as react-dsfr's starter, with a persistent
// runtime instead of overwriting an already loaded API with its configuration.
export async function start({defaultColorScheme, verbose, nextParams, doCheckNonce, trustedTypesPolicyName}) {
  if (isStarted) return
  isStarted = true
  const registerEffectAction = nextParams?.registerEffectAction ?? (action => action())
  startClientSideIsDarkLogic({
    colorSchemeExplicitlyProvidedAsParameter: defaultColorScheme,
    doPersistDarkModePreferenceWithCookie: nextParams?.doPersistDarkModePreferenceWithCookie ?? false,
    registerEffectAction,
    doCheckNonce,
    trustedTypesPolicyName
  })
  const runtime = await loadRuntime(verbose)
  resolveLoaded()
  registerEffectAction(() => runtime.start())
}
