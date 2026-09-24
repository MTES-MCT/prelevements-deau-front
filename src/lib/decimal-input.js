import {groupIntegerDigits} from '../utils/number.js'

export function normalizeNumberInput(value) {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  const compactValue = String(value)
    .replaceAll(/\s/g, '')
    .replaceAll(',', '.')
    .replaceAll(/[^\d.]/g, '')

  if (!compactValue) {
    return ''
  }

  const hasDecimalSeparator = compactValue.includes('.')
  const [integerPart = '', ...fractionParts] = compactValue.split('.')
  const integer = integerPart.replace(/^0+(?=\d)/, '')
  const fraction = fractionParts.join('')

  if (!hasDecimalSeparator) {
    return integer
  }

  return `${integer || '0'}.${fraction}`
}

export function formatNumberInput(value) {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  const normalizedValue = String(value)
  const [integerPart = '0', fractionPart = ''] = normalizedValue.split('.')
  const groupedInteger = groupIntegerDigits(integerPart || '0')

  if (!normalizedValue.includes('.')) {
    return groupedInteger
  }

  return `${groupedInteger},${fractionPart}`
}

export function countEditableNumberCharacters(value, endIndex) {
  let count = 0

  for (const character of String(value).slice(0, endIndex)) {
    if (/[\d,.]/.test(character)) {
      count += 1
    }
  }

  return count
}

export function getFormattedCaretPosition(value, editableCharactersCount) {
  if (editableCharactersCount <= 0) {
    return 0
  }

  let count = 0

  for (const [index, character] of [...value].entries()) {
    if (/[\d,]/.test(character)) {
      count += 1

      if (count >= editableCharactersCount) {
        return index + 1
      }
    }
  }

  return value.length
}
