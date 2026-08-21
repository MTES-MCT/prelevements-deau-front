'use server'

import {fetchJSON} from '@/server/api-wrapper.js'

const GENERIC_ACTIVATION_ERROR = 'Le lien est invalide ou expiré, ou le mot de passe ne respecte pas les règles de sécurité.'
const GENERIC_CHANGE_ERROR = 'Le mot de passe n’a pas pu être modifié. Vérifiez le mot de passe actuel et les règles de sécurité.'

export async function activatePasswordAction({password, token}) {
  try {
    const data = await fetchJSON('auth/password/activate', {
      method: 'POST',
      body: {password, token},
      requireAuth: false
    })

    return {success: true, data}
  } catch {
    return {success: false, error: GENERIC_ACTIVATION_ERROR}
  }
}

export async function changePasswordAction({currentPassword, newPassword}) {
  try {
    const data = await fetchJSON('auth/password/change', {
      method: 'POST',
      body: {currentPassword, newPassword}
    })

    return {success: true, data}
  } catch {
    return {success: false, error: GENERIC_CHANGE_ERROR}
  }
}
