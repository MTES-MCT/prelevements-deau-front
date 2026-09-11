import {readFile} from 'node:fs/promises'
import {createServer} from 'node:http'
import {resolve, sep, extname} from 'node:path'

// Synthetic backend: deliberately no database, outbound HTTP, mail or jobs.
const zoneId = '11111111-1111-4111-8111-111111111111'
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

  if (request.headers.authorization !== 'Bearer browser-test-api-token') {
    return send(401, {message: 'Unauthorized'})
  }

  if (pathname === '/info') {
    return send(200, {
      role: 'INSTRUCTOR', permissions: ['zone.export'], user: {id: zoneId, email: 'test@example.test'},
      expiresAt: new Date(Date.now() + 3_600_000).toISOString()
    })
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
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    api.close()
    stories.close()
  })
}
