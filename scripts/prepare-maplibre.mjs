import {copyFile, mkdir, readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

// MapLibre 6 discovers its ESM worker dynamically, so Webpack and Vite cannot
// emit it automatically. Publish the exact installed worker and its relative
// shared module together, on our own origin and under a versioned URL.
const distribution = path.dirname(fileURLToPath(import.meta.resolve('maplibre-gl')))
const {version} = JSON.parse(await readFile(path.join(distribution, '../package.json'), 'utf8'))
if (!/^\d+\.\d+\.\d+$/v.test(version)) {
  throw new Error('A stable MapLibre version is required')
}

const destination = fileURLToPath(new URL(`../public/maplibre/${version}/`, import.meta.url))
await mkdir(destination, {recursive: true})
await Promise.all(['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'].map(async filename => {
  await copyFile(path.join(distribution, filename), path.join(destination, filename))
}))
await copyFile(path.join(distribution, '../LICENSE.txt'), path.join(destination, 'LICENSE.txt'))
