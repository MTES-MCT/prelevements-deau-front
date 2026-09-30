import {formatNumberInput, normalizeNumberInput} from './decimal-input.js'

export function normalizeCampaignNumberInput(value) {
  const text = String(value ?? '').replaceAll(/\s/g, '').replaceAll(',', '.')
  return /^\d*(?:\.\d*)?$/.test(text) ? normalizeNumberInput(text) : text
}

export function formatCampaignNumberInput(value) {
  const text = String(value ?? '')
  return /^-?\d*(?:\.\d*)?$/.test(text) ? formatNumberInput(text) : text
}

export function campaignNumberError(value, field) {
  const text = String(value ?? '').trim()
  const labels = {
    indexStart: ['l’index relevé sur votre compteur', 'L’index du compteur doit être supérieur ou égal à zéro.'],
    indexEnd: ['l’index relevé sur votre compteur', 'L’index du compteur doit être supérieur ou égal à zéro.'],
    surface: ['la surface irriguée en hectares', 'La surface irriguée doit être supérieure ou égale à zéro.'],
    volume: ['le volume demandé en m³', 'Le volume demandé doit être supérieur ou égal à zéro.'],
    flow: ['le débit demandé en m³/h', 'Le débit demandé doit être supérieur ou égal à zéro.']
  }
  const [label, negative] = labels[field]
  if (!text) return `Renseignez ${label}.`
  if (/^-\d+(?:[.,]\d+)?$/.test(text)) return negative
  return `Vérifiez ${label}.`
}
