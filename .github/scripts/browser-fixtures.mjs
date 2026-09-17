import {readFile} from 'node:fs/promises'
import {mkdtempSync, readFileSync, rmSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createServer, request as proxyRequest} from 'node:http'
import {createServer as createSecureServer} from 'node:https'
import {tmpdir} from 'node:os'
import {resolve, sep, extname, join} from 'node:path'
import {createPublicStatsFixture} from '../../src/test/public-stats-fixture.js'

// Synthetic backend: deliberately no database, outbound HTTP, mail or jobs.
const zoneId = '11111111-1111-4111-8111-111111111111'
const meterId = '22222222-2222-4222-8222-222222222222'
const api = createServer((request, response) => {
  const {pathname} = new URL(request.url, 'http://127.0.0.1:3431')
  const send = (status, value) => {
    response.writeHead(status, {'Content-Type': 'application/json'})
    response.end(JSON.stringify(value))
  }

  if (pathname === '/health') {
    return send(200, {ok: true})
  }

  if (pathname === '/auth/config') {
    return send(200, {methods: ['password', 'magic_link']})
  }

  if (pathname === '/auth/request' && request.method === 'POST') {
    return send(200, {success: true})
  }

  if (pathname === '/api/stats/public' && request.method === 'GET') {
    const month = new URL(request.url, 'http://127.0.0.1:3431').searchParams.get('month') ?? '2026-08'
    if (!['2026-06', '2026-07', '2026-08'].includes(month)) {
      return send(400, {message: 'Sélectionnez un mois terminé.'})
    }

    return send(200, createPublicStatsFixture(month))
  }

  const meterRole = request.headers.authorization === 'Bearer browser-test-meter-admin' ? 'ADMIN'
    : request.headers.authorization === 'Bearer browser-test-meter-declarant' ? 'DECLARANT' : null
  if (request.headers.authorization !== 'Bearer browser-test-api-token' && !meterRole) {
    return send(401, {message: 'Unauthorized'})
  }

  if (pathname === '/info' || pathname === '/api/info') {
    return send(200, {
      role: meterRole || 'INSTRUCTOR', permissions: ['zone.export'], user: {id: zoneId, email: 'test@example.test'},
      expiresAt: new Date(Date.now() + 3_600_000).toISOString()
    })
  }

  if (pathname === '/api/users/me/activity' && request.method === 'POST') {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit'}).formatToParts(new Date())
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    return send(200, {month: `${values.year}-${values.month}`})
  }

  if (pathname === '/api/users/me/zones') {
    return send(200, [])
  }

  if (pathname === '/api/zones/options') {
    return send(200, [{id: zoneId, name: 'Zone de test'}])
  }

  if (pathname === '/api/points-prelevement/options') {
    return send(200, [{id: zoneId, name: 'Point synthétique'}])
  }

  if (pathname === '/api/referentiels/usages-eau') {
    return send(200, {items: []})
  }

  if (meterRole && pathname === `/api/exploitations/${zoneId}`) {
    return send(200, {
      id: zoneId, status: 'EN_ACTIVITE', startDate: '2026-01-01', endDate: null,
      connectors: [{id: 'legacy-synthetic', connectorType: 'orange_live_objects', connectorParameters: {sourcePointId: 'LEGACY-002'}, rate: 25}],
      mostRecentAvailableDate: '2026-09-15', collecteurs: [],
      declarant: {id: zoneId, socialReason: 'Préleveur synthétique'},
      pointPrelevement: {id: meterId, name: 'Point synthétique'},
      right: {canEdit: false, permissions: []}
    })
  }

  if (meterRole && pathname === `/api/exploitations/${zoneId}/meter-allocations`) {
    return send(200, {meterAllocations: [{
      id: 'allocation-synthetic', compteur: {id: meterId, serialNumber: 'SYNTHETIC-001'},
      percentage: '70', startDate: '2026-01-01', endDate: null, status: 'ACTIVE', provider: 'sample-provider',
      sync: {available: true, state: 'SUCCESS', lastSuccessAt: '2026-09-17T10:00:00Z', lastReadingAt: '2026-09-16T08:11:43Z'},
      capabilities: {canReadGlobalReadings: meterRole === 'ADMIN'}
    }]})
  }

  if (meterRole && pathname === `/api/exploitations/${zoneId}/meters/${meterId}/readings`) {
    if (meterRole !== 'ADMIN') {
      return send(403, {message: 'Droits insuffisants'})
    }

    const cursor = new URL(request.url, 'http://127.0.0.1:3431').searchParams.get('cursor')
    return send(200, {
      items: cursor ? [{id: 'reading-2', observedAt: '2026-09-15T08:11:43Z', index: '12000', quality: 'Y', origin: 'Auto', admissible: false}]
        : [{id: 'reading-1', observedAt: '2026-09-16T08:11:43Z', index: '12300', quality: 'C', origin: 'Manuel', admissible: true}],
      nextCursor: cursor ? null : 'synthetic-page-2'
    })
  }

  if (meterRole && (pathname.endsWith('/documents') || pathname.endsWith('/regles'))) {
    return send(200, [])
  }

  if (meterRole && pathname.startsWith('/api/audit-history/')) {
    return send(200, {data: [], meta: {total: 0}})
  }

  if (meterRole && pathname === '/api/aggregated-series/options') {
    return send(200, {parameters: []})
  }

  return send(404, {message: 'No synthetic fixture for this route'})
})

const directory = resolve('storybook-static')
const contentTypes = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'
}
const stories = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1:3432').pathname)
    const file = resolve(directory, '.' + (pathname === '/' ? '/index.html' : pathname))
    if (!file.startsWith(directory + sep)) {
      response.writeHead(403).end()
      return
    }

    const body = await readFile(file)
    response.writeHead(200, {'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream'})
    response.end(body)
  } catch {
    response.writeHead(404).end()
  }
})
api.listen(3431, '127.0.0.1')
stories.listen(3432, '127.0.0.1')

// Production sessions use Secure cookies. Exercise them over HTTPS on every
// browser, without weakening the application or committing a private key.
const tlsDirectory = mkdtempSync(join(tmpdir(), 'ple-browser-tls-'))
const tlsKey = join(tlsDirectory, 'key.pem')
const tlsCertificate = join(tlsDirectory, 'cert.pem')
execFileSync('openssl', [
  'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
  '-keyout', tlsKey, '-out', tlsCertificate, '-subj', '/CN=localhost',
  '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'
], {stdio: 'ignore'})
const secureFront = createSecureServer({
  key: readFileSync(tlsKey), cert: readFileSync(tlsCertificate)
}, (request, response) => {
  const upstream = proxyRequest({
    hostname: '127.0.0.1', port: 3417, path: request.url, method: request.method,
    headers: {...request.headers, 'x-forwarded-host': request.headers.host, 'x-forwarded-proto': 'https'}
  }, incoming => {
    response.writeHead(incoming.statusCode, incoming.headers)
    incoming.pipe(response)
  })
  upstream.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(502)
    }

    response.end()
  })
  request.pipe(upstream)
})
secureFront.listen(3443, '127.0.0.1')
process.once('exit', () => rmSync(tlsDirectory, {recursive: true, force: true}))
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    api.close()
    stories.close()
    secureFront.close()
  })
}
