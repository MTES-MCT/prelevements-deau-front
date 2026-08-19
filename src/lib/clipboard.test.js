import test from 'ava'

import {copyTextToClipboard} from './clipboard.js'

test('copyTextToClipboard utilise l’API Clipboard sans modifier le texte', async t => {
  const copiedValues = []

  t.true(await copyTextToClipboard('Contact@Example.fr', {
    clipboard: {
      async writeText(value) {
        copiedValues.push(value)
      }
    }
  }))
  t.deepEqual(copiedValues, ['Contact@Example.fr'])
})

test('copyTextToClipboard utilise le repli et restaure le focus', async t => {
  const calls = []
  const previousFocus = {focus: () => calls.push('restore-focus')}
  const textArea = {
    style: {},
    focus: () => calls.push('textarea-focus'),
    remove: () => calls.push('remove'),
    select: () => calls.push('select'),
    setAttribute: (name, value) => calls.push(['attribute', name, value]),
    setSelectionRange: (start, end) => calls.push(['selection-range', start, end])
  }
  const documentReference = {
    activeElement: previousFocus,
    body: {append: value => calls.push(['append', value])},
    createElement(tagName) {
      calls.push(['create', tagName])
      return textArea
    },
    execCommand(command) {
      calls.push(['command', command])
      return true
    }
  }

  t.true(await copyTextToClipboard('alias@example.fr', {
    clipboard: null,
    documentReference
  }))
  t.is(textArea.value, 'alias@example.fr')
  t.is(calls.at(-2), 'remove')
  t.is(calls.at(-1), 'restore-focus')
})

test('copyTextToClipboard retourne false si aucune méthode ne fonctionne', async t => {
  t.false(await copyTextToClipboard('', {clipboard: null, documentReference: null}))
  t.false(await copyTextToClipboard('email@example.fr', {
    clipboard: {
      async writeText() {
        throw new Error('refus')
      }
    },
    documentReference: null
  }))
})
