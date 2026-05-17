'use server'

import {revalidatePath} from 'next/cache'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

function revalidateServiceAccountPaths(serviceAccountId) {
  revalidatePath('/comptes-service')
  revalidatePath('/comptes-service/nouveau')

  if (!serviceAccountId) {
    return
  }

  revalidatePath(`/comptes-service/${serviceAccountId}`)
  revalidatePath(`/comptes-service/${serviceAccountId}/identifiants`)
  revalidatePath(`/comptes-service/${serviceAccountId}/declarants`)
}

async function fetchAdminServiceAccountData(url, options = {}) {
  const response = await fetchJSON(url, options)
  return response?.data ?? null
}

function buildServiceAccountsSearch({includeDeleted = true} = {}) {
  const searchParams = new URLSearchParams()
  searchParams.set('includeDeleted', String(includeDeleted))
  return `?${searchParams.toString()}`
}

export async function listServiceAccountsAction(options = {}) {
  return withErrorHandling(async () => {
    const search = buildServiceAccountsSearch(options)
    return fetchAdminServiceAccountData(`api/admin/service-accounts${search}`)
  })
}

export async function getServiceAccountAction(serviceAccountId) {
  return withErrorHandling(async () => {
    if (!serviceAccountId) {
      throw new Error('serviceAccountId est requis.')
    }

    return fetchAdminServiceAccountData(`api/admin/service-accounts/${serviceAccountId}`)
  })
}

export async function listServiceAccountDeclarantOptionsAction() {
  return withErrorHandling(async () => fetchAdminServiceAccountData('api/admin/service-accounts/declarants-options'))
}

export async function createServiceAccountAction(payload) {
  return withErrorHandling(async () => {
    const data = await fetchAdminServiceAccountData('api/admin/service-accounts', {
      method: 'POST',
      body: payload
    })

    revalidateServiceAccountPaths(data?.id)
    return data
  })
}

export async function updateServiceAccountAction(serviceAccountId, payload) {
  return withErrorHandling(async () => {
    const data = await fetchAdminServiceAccountData(`api/admin/service-accounts/${serviceAccountId}`, {
      method: 'PUT',
      body: payload
    })

    revalidateServiceAccountPaths(serviceAccountId)
    return data
  })
}

export async function deleteServiceAccountAction(serviceAccountId) {
  return withErrorHandling(async () => {
    const data = await fetchAdminServiceAccountData(`api/admin/service-accounts/${serviceAccountId}`, {
      method: 'DELETE'
    })

    revalidateServiceAccountPaths(serviceAccountId)
    return data
  })
}

export async function restoreServiceAccountAction(serviceAccountId) {
  return withErrorHandling(async () => {
    const data = await fetchAdminServiceAccountData(`api/admin/service-accounts/${serviceAccountId}/restore`, {
      method: 'POST'
    })

    revalidateServiceAccountPaths(serviceAccountId)
    return data
  })
}

export async function createServiceAccountCredentialAction(serviceAccountId, payload) {
  return withErrorHandling(async () => {
    const data = await fetchAdminServiceAccountData(`api/admin/service-accounts/${serviceAccountId}/credentials`, {
      method: 'POST',
      body: payload
    })

    revalidateServiceAccountPaths(serviceAccountId)
    return data
  })
}

export async function revokeServiceAccountCredentialAction(serviceAccountId, credentialId) {
  return withErrorHandling(async () => {
    const data = await fetchAdminServiceAccountData(`api/admin/service-accounts/${serviceAccountId}/credentials/${credentialId}`, {
      method: 'DELETE'
    })

    revalidateServiceAccountPaths(serviceAccountId)
    return data
  })
}

export async function addServiceAccountDeclarantAction(serviceAccountId, payload) {
  return withErrorHandling(async () => {
    const data = await fetchAdminServiceAccountData(`api/admin/service-accounts/${serviceAccountId}/declarants`, {
      method: 'POST',
      body: payload
    })

    revalidateServiceAccountPaths(serviceAccountId)
    return data
  })
}

export async function updateServiceAccountDeclarantAction(serviceAccountId, linkId, payload) {
  return withErrorHandling(async () => {
    const data = await fetchAdminServiceAccountData(`api/admin/service-accounts/${serviceAccountId}/declarants/${linkId}`, {
      method: 'PUT',
      body: payload
    })

    revalidateServiceAccountPaths(serviceAccountId)
    return data
  })
}

export async function removeServiceAccountDeclarantAction(serviceAccountId, linkId) {
  return withErrorHandling(async () => {
    const data = await fetchAdminServiceAccountData(`api/admin/service-accounts/${serviceAccountId}/declarants/${linkId}`, {
      method: 'DELETE'
    })

    revalidateServiceAccountPaths(serviceAccountId)
    return data
  })
}
