import {createHmac, randomUUID} from 'node:crypto'

const MAX_IP_LENGTH = 128
const MAX_USER_AGENT_LENGTH = 512

function getAuditContextSecret(explicitSecret) {
  const secret = explicitSecret ?? process.env.AUDIT_CONTEXT_SECRET

  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('AUDIT_CONTEXT_SECRET est requis dans cet environnement.')
  }

  if (secret && secret.length < 32) {
    throw new Error('AUDIT_CONTEXT_SECRET doit contenir au moins 32 caractères.')
  }

  return secret || null
}

function getFirstForwardedValue(value) {
  return value?.split(',')[0]?.trim() || null
}

function readClientIp(headers) {
  return (
    getFirstForwardedValue(headers.get('x-forwarded-for'))
    || headers.get('x-real-ip')
    || headers.get('cf-connecting-ip')
    || null
  )?.slice(0, MAX_IP_LENGTH) ?? null
}

export function buildSignedAuditContextHeaders({
  incomingHeaders,
  requestId = randomUUID(),
  secret,
  timestamp = Date.now()
} = {}) {
  const resolvedSecret = getAuditContextSecret(secret)

  if (!resolvedSecret || !incomingHeaders) {
    return {}
  }

  const payload = {
    clientIp: readClientIp(incomingHeaders),
    userAgent: incomingHeaders.get('user-agent')?.slice(0, MAX_USER_AGENT_LENGTH) || null,
    timestamp,
    requestId
  }
  const encodedContext = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', resolvedSecret)
    .update(encodedContext)
    .digest('hex')

  return {
    'X-PLE-Audit-Context': encodedContext,
    'X-PLE-Audit-Signature': signature
  }
}

export async function getSignedAuditContextHeaders(requestId) {
  let incomingHeaders

  try {
    const {headers: getRequestHeaders} = await import('next/headers')
    incomingHeaders = await getRequestHeaders()
  } catch {
    return {}
  }

  return buildSignedAuditContextHeaders({incomingHeaders, requestId})
}
