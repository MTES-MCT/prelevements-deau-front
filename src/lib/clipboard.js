export async function copyTextToClipboard(value, {
  clipboard = globalThis.navigator?.clipboard,
  documentReference = globalThis.document
} = {}) {
  const text = String(value ?? '')

  if (!text) {
    return false
  }

  if (typeof clipboard?.writeText === 'function') {
    try {
      await clipboard.writeText(text)
      return true
    } catch {
      // Use the legacy fallback below when the Clipboard API is unavailable.
    }
  }

  if (!documentReference?.body || typeof documentReference.createElement !== 'function') {
    return false
  }

  const previousFocus = documentReference.activeElement
  const textArea = documentReference.createElement('textarea')

  textArea.value = text
  textArea.setAttribute('readonly', '')
  textArea.style.opacity = '0'
  textArea.style.position = 'fixed'
  textArea.style.pointerEvents = 'none'
  documentReference.body.append(textArea)

  try {
    textArea.focus()
    textArea.select()
    textArea.setSelectionRange?.(0, text.length)

    return documentReference.execCommand?.('copy') === true
  } catch {
    return false
  } finally {
    textArea.remove()
    previousFocus?.focus?.()
  }
}
