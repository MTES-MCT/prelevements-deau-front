import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'

import tailwind from '@tailwindcss/postcss'
import test from 'ava'
import postcss from 'postcss'

const source = new URL('../app/globals.css', import.meta.url)
let compiled

test.before(async () => {
  compiled = await postcss([tailwind()]).process(await readFile(source, 'utf8'), {
    from: fileURLToPath(source)
  })
})

function declarations(selector) {
  const result = {}
  compiled.root.walkRules(selector, rule => {
    rule.walkDecls(declaration => {
      result[declaration.prop] = declaration.value
    })
  })
  return result
}

test('Tailwind conserve les dimensions et rayons utilisés par les formulaires', t => {
  t.is(declarations('.rounded')['border-radius'], '0.25rem')
  t.is(declarations('.rounded-xs')['border-radius'], 'var(--radius-xs)')
  t.is(declarations('.shrink-0')['flex-shrink'], '0')
  t.is(declarations('.border')['border-width'], '1px')
})

test('les couleurs v3 sont conservées, sans conversion de palette', t => {
  const variables = {}
  compiled.root.walkDecls(/^--color-/, declaration => {
    variables[declaration.prop] = declaration.value
  })
  t.is(variables['--color-gray-200'], '#e5e7eb')
  t.is(variables['--color-gray-400'], '#9ca3af')
  t.is(variables['--color-blue-500'], '#3b82f6')
  t.is(variables['--color-red-500'], '#ef4444')
})

test('les utilitaires gardent la même priorité que les styles DSFR existants', t => {
  compiled.root.walkRules('.border', rule => {
    t.is(rule.parent.type, 'root')
  })
  t.is(declarations('body').display, 'flex')
  t.is(declarations('main')['flex-grow'], '1')
  t.is(declarations('input::placeholder, textarea::placeholder').color, 'var(--color-gray-400)')
})
