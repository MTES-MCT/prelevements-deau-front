import test from 'ava'

import {campaignNumberError, formatCampaignNumberInput, normalizeCampaignNumberInput} from './campaign-numbers.js'

test('la saisie campagne conserve un zéro et les nombres français', t => {
  t.is(normalizeCampaignNumberInput(''), '')
  t.is(normalizeCampaignNumberInput('0'), '0')
  t.is(normalizeCampaignNumberInput('001 234,50'), '1234.50')
  t.regex(formatCampaignNumberInput('1234.50'), /^1\s234,50$/)
})

test('une valeur invalide n’est jamais transformée en un autre nombre valide', t => {
  for (const value of ['-12', '1e3', '12.3.4', 'abc']) {
    t.is(normalizeCampaignNumberInput(value), value)
    t.is(formatCampaignNumberInput(value), value)
  }
  t.is(normalizeCampaignNumberInput('-1,5'), '-1.5')
  t.is(formatCampaignNumberInput('-1.5'), '-1,5')
})

test('les messages métier distinguent un champ manquant, négatif et invalide', t => {
  for (const [field, label] of [['indexStart', 'l’index relevé sur votre compteur'], ['indexEnd', 'l’index relevé sur votre compteur'], ['volume', 'le volume demandé en m³'], ['flow', 'le débit demandé en m³/h'], ['surface', 'la surface irriguée en hectares']]) {
    t.is(campaignNumberError('', field), `Renseignez ${label}.`)
    t.is(campaignNumberError('1e3', field), `Vérifiez ${label}.`)
    t.true(campaignNumberError('-1', field).includes('zéro'))
    t.false(campaignNumberError('1.23456', field).includes('chiffres'))
  }
})
