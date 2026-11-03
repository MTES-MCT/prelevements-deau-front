import test from 'ava'

import {createCsvBlob, downloadCsv} from './export-csv.js'

test('le téléchargement restaure le BOM UTF-8 perdu par Response.text()', async t => {
  const csv = '\uFEFFPréleveur;Volume (m³);Commentaire\r\nÉlodie;12;"À l’Île — été, œuf €"\r\n'
  const response = new Response(csv, {headers: {'Content-Type': 'text/csv; charset=utf-8'}})
  const content = await response.text()
  t.false(content.startsWith('\uFEFF'))

  const blob = createCsvBlob(content)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  t.deepEqual([...bytes.slice(0, 3)], [0xEF, 0xBB, 0xBF])
  t.deepEqual(bytes, new TextEncoder().encode(csv))
  t.is(blob.type, 'text/csv;charset=utf-8;')
})

test('un CSV qui contient déjà le BOM est conservé sans doublon', async t => {
  const csv = '\uFEFFPrélèvement;Volume\r\nÉtang;0\r\n'
  const bytes = new Uint8Array(await createCsvBlob(csv).arrayBuffer())
  t.deepEqual(bytes, new TextEncoder().encode(csv))
})

test.serial('l’export local des règles télécharge aussi un CSV UTF-8 avec BOM', async t => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const link = {
    style: {},
    setAttribute(key, value) { this[key] = value },
    click() {},
    remove() {}
  }
  Object.defineProperty(globalThis, 'document', {configurable: true, value: {
    createElement: () => link,
    body: {append() {}}
  }})
  t.teardown(() => {
    URL.revokeObjectURL(link.href)
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
    else delete globalThis.document
  })

  downloadCsv([{libellé: 'Été à l’Île — 12 m³', volume: 12}], 'regles.csv')
  const response = await fetch(link.href)
  const bytes = new Uint8Array(await response.arrayBuffer())
  t.is(link.download, 'regles.csv')
  t.deepEqual(bytes, new TextEncoder().encode('\uFEFFlibellé,volume\n"Été à l’Île — 12 m³","12"'))
})
