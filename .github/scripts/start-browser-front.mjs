import {spawn} from 'node:child_process'
import {cpSync, existsSync} from 'node:fs'

if (!existsSync('.next/standalone/server.js')) {
  throw new Error('Build standalone absent : exécuter npm run build avant les tests navigateur.')
}

cpSync('public', '.next/standalone/public', {recursive: true})
cpSync('.next/static', '.next/standalone/.next/static', {recursive: true})
const server = spawn(process.execPath, ['.next/standalone/server.js'], {stdio: 'inherit', env: process.env})
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.kill(signal))
}

server.once('error', () => {
  process.exitCode = 1
})
server.once('exit', code => {
  process.exitCode = code ?? 1
})
