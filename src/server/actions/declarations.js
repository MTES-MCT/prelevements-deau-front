'use server'

import {revalidatePath} from 'next/cache'
import moment from 'moment'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

function normalizeMonthInput(value, fieldName) {
    if (!value) {
        throw new Error(`${fieldName} est obligatoire.`)
    }

    const m =
        value instanceof Date
            ? moment.utc(value)
            : moment.utc(String(value).trim(), 'YYYY-MM-DD', true)

    if (!m.isValid()) {
        throw new Error(`${fieldName} doit être une date valide au format YYYY-MM-DD.`)
    }

    if (m.date() !== 1) {
        throw new Error(`${fieldName} doit correspondre au 1er du mois (YYYY-MM-01).`)
    }

    return m.format('YYYY-MM-DD')
}

/**
 * Create a declaration with files (multipart/form-data)
 *
 * Expects:
 * - files: File[]
 * - fileTypes: string[] (1 type métier par fichier, même ordre, unique par déclaration)
 * - comment?: string
 * - startMonth: "YYYY-MM-DD" (toujours le 1er du mois)
 * - endMonth: "YYYY-MM-DD" (toujours le 1er du mois, >= startMonth)
 * - aotDecreeNumber?: string
 *
 * Côté API :
 * - status = défaut (SUBMITTED)
 * - dataSourceType = SPREADSHEET
 * - waterWithdrawalType = "Inconnu"
 */
export async function createDeclarationAction({
  files = [],
  fileTypes = [],
  comment,
  startMonth,
  endMonth,
  aotDecreeNumber
} = {}) {
    return withErrorHandling(async () => {
        if (!Array.isArray(files) || files.length === 0) {
            throw new Error('Aucun fichier fourni.')
        }

        if (!Array.isArray(fileTypes) || fileTypes.length !== files.length) {
            throw new Error('fileTypes doit contenir exactement un type par fichier.')
        }

        const normalizedTypes = fileTypes.map(t => (t || '').trim().toLowerCase())
        if (normalizedTypes.some(t => !t)) {
            throw new Error('Chaque fichier doit avoir un type non vide.')
        }

        if (new Set(normalizedTypes).size !== normalizedTypes.length) {
            throw new Error('Chaque type doit être unique dans une déclaration.')
        }

        const start = normalizeMonthInput(startMonth, 'startMonth')
        const end = normalizeMonthInput(endMonth, 'endMonth')

        if (moment.utc(start).isAfter(moment.utc(end))) {
            throw new Error('startMonth doit être antérieur ou égal à endMonth.')
        }

        const formData = new FormData()

        formData.append('startMonth', start)
        formData.append('endMonth', end)

        if (typeof comment === 'string' && comment.trim()) {
            formData.append('comment', comment.trim())
        }

        if (typeof aotDecreeNumber === 'string' && aotDecreeNumber.trim()) {
            formData.append('aotDecreeNumber', aotDecreeNumber.trim())
        }

        files.forEach((file, i) => {
            formData.append('files', file)
            formData.append('fileTypes', fileTypes[i])
        })

        const data = await fetchJSON('api/declarations', {
            method: 'POST',
            body: formData
        })

        revalidateDeclarationPaths(data?.data?.id)

        return data
    })
}

/**
 * Get user declarations
 */
export async function getMyDeclarationsAction() {
    return withErrorHandling(async () => fetchJSON('api/declarations/me'))
}

/**
 * Get a single declaration by ID (UUID)
 */
export async function getDeclarationAction(declarationId) {
    return withErrorHandling(async () => {
        if (!declarationId) {
            throw new Error('declarationId est requis.')
        }
        return await fetchJSON(`api/declarations/${declarationId}`)
    })
}

/**
 * Revalidate declaration paths after mutations
 */
export async function revalidateDeclarationPaths(declarationId) {
    revalidatePath('/declarations')
    revalidatePath('/declarations/me')

    if (declarationId) {
        revalidatePath(`/declarations/${declarationId}`)
    }
}
