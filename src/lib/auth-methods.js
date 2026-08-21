export const AUTH_METHODS = Object.freeze({
  MAGIC_LINK: 'magic_link',
  PASSWORD: 'password'
})

const AUTH_METHOD_PATTERN = /^[a-z][a-z\d_]*$/

export function parseAuthConfig(payload) {
  const methods = payload?.methods

  if (!Array.isArray(methods) || methods.length === 0) {
    throw new TypeError('La configuration des méthodes d’authentification est invalide.')
  }

  const normalizedMethods = methods.map(method => {
    if (typeof method !== 'string' || !AUTH_METHOD_PATTERN.test(method)) {
      throw new TypeError('La configuration des méthodes d’authentification est invalide.')
    }

    return method
  })

  if (new Set(normalizedMethods).size !== normalizedMethods.length) {
    throw new TypeError('La configuration des méthodes d’authentification contient des doublons.')
  }

  return Object.freeze({methods: Object.freeze(normalizedMethods)})
}

export function hasAuthMethod(config, method) {
  return config?.methods?.includes(method) === true
}

export function getPasswordLength(password) {
  return [...String(password || '').normalize('NFC')].length
}

export function validateNewPassword(password, confirmation) {
  const length = getPasswordLength(password)

  if (length < 15) {
    return 'Le mot de passe doit contenir au moins 15 caractères.'
  }

  if (length > 128) {
    return 'Le mot de passe ne doit pas dépasser 128 caractères.'
  }

  if (password !== confirmation) {
    return 'Les deux mots de passe ne correspondent pas.'
  }

  return null
}

function hasUnsafeCallbackCharacter(value) {
  return [...value].some(character => {
    const codePoint = character.codePointAt(0)
    return character === '\\' || codePoint <= 31 || codePoint === 127
  })
}

export function getSafeCallbackUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/'
  }

  if (hasUnsafeCallbackCharacter(value)) {
    return '/'
  }

  let decodedValue = value

  try {
    for (let index = 0; index < 3; index += 1) {
      const nextValue = decodeURIComponent(decodedValue)

      if (nextValue === decodedValue) {
        break
      }

      decodedValue = nextValue
    }
  } catch {
    return '/'
  }

  if (hasUnsafeCallbackCharacter(decodedValue) || decodedValue.startsWith('//')) {
    return '/'
  }

  const trustedOrigin = 'https://partageonsleau.invalid'

  try {
    const parsedUrl = new URL(value, trustedOrigin)
    const decodedUrl = new URL(decodedValue, trustedOrigin)

    if (
      parsedUrl.origin !== trustedOrigin
      || decodedUrl.origin !== trustedOrigin
      || parsedUrl.pathname.startsWith('//')
      || decodedUrl.pathname.startsWith('//')
    ) {
      return '/'
    }

    const destination = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
    const validatedDestination = new URL(destination, trustedOrigin)

    if (
      destination.startsWith('//')
      || validatedDestination.origin !== trustedOrigin
      || validatedDestination.href !== parsedUrl.href
    ) {
      return '/'
    }

    return destination
  } catch {
    return '/'
  }
}
