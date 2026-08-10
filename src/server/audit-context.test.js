import {createHmac} from 'node:crypto'

import test from 'ava'

import {buildSignedAuditContextHeaders} from '@/server/audit-context.js'

test('buildSignedAuditContextHeaders signe le contexte réseau sans exposer le secret', t => {
  const secret = 'test-secret-with-more-than-thirty-two-bytes'
  const headers = new Headers({
    'user-agent': 'Test browser',
    'x-forwarded-for': '203.0.113.4, 10.0.0.1'
  })
  const result = buildSignedAuditContextHeaders({
    incomingHeaders: headers,
    requestId: 'request-id',
    secret,
    timestamp: 1_786_364_200_000
  })
  const encoded = result['X-PLE-Audit-Context']
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))

  t.deepEqual(payload, {
    clientIp: '203.0.113.4',
    userAgent: 'Test browser',
    timestamp: 1_786_364_200_000,
    requestId: 'request-id'
  })
  t.is(
    result['X-PLE-Audit-Signature'],
    createHmac('sha256', secret).update(encoded).digest('hex')
  )
  t.false(JSON.stringify(result).includes(secret))
})
