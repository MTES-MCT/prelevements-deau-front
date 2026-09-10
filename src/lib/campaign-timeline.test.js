import test from 'ava'

import {buildCampaignTimeline, getCampaignPosition} from './campaign-timeline.js'

const daysBetween = (start, end) => (Date.parse(end) - Date.parse(start)) / 86_400_000
const near = (t, actual, expected) => t.true(Math.abs(actual - expected) < 0.000_001, `${actual} doit être égal à ${expected}`)
const need = (startDate, endDate, extra = {}) => ({
  kind: 'NEEDS', label: 'Besoins en eau', startDate, endDate, ...extra
})

test('relevés, besoins et réponses partagent une échelle calendaire réelle arrondie aux mois', t => {
  const result = buildCampaignTimeline({
    indexDates: ['2026-01-10', '2026-06-10'], periods: [need('2026-07-01', '2026-09-01')],
    opensAt: '2026-09-05T00:00', closesAt: '2026-10-15T23:59', reminderDays: [14, 3]
  })
  t.is(result.startDate, '2026-01-01')
  t.is(result.endDate, '2026-11-01')
  const duration = daysBetween(result.startDate, result.endDate)
  near(t, result.readings[0].left, 100 * (9 / duration))
  near(t, result.needs[0].left, 100 * (daysBetween(result.startDate, '2026-07-01') / duration))
  near(t, result.needs[0].width, 100 * (62 / duration))
  near(t, result.response.width, 100 * (41 / duration))
  t.is(result.needs[0].inclusiveEndDate, '2026-08-31')
  t.is(result.response.startDate, '2026-09-05')
  t.is(result.response.endDate, '2026-10-16')
  t.true(result.response.valid)
  t.true(result.needs[0].left > result.readings[1].left)
  t.true(result.response.left > result.needs[0].left + result.needs[0].width)
  t.deepEqual(result.pending, [])
})

test('les fins exclusives ne créent aucun jour ni mois supplémentaire', t => {
  const result = buildCampaignTimeline({periods: [need('2026-01-01', '2026-04-01')]})
  t.is(result.startDate, '2026-01-01')
  t.is(result.endDate, '2026-04-01')
  t.is(result.needs[0].inclusiveEndDate, '2026-03-31')
  t.is(result.needs[0].left, 0)
  t.is(result.needs[0].width, 100)
  t.deepEqual(result.ticks.map(tick => tick.date), ['2026-01-01', '2026-02-01', '2026-03-01'])
  t.deepEqual(result.years, [{
    label: '2026', start: '2026-01-01', end: '2026-04-01', left: 0, width: 100
  }])
})

test('un relevé au premier jour du mois reste visible et les changements d’heure ne déforment pas les jours', t => {
  const result = buildCampaignTimeline({indexDates: ['2026-03-28', '2026-03-29', '2026-03-30', '2026-04-01']})
  t.is(result.endDate, '2026-05-01')
  near(t, result.readings[1].left - result.readings[0].left, 100 / 61)
  near(t, result.readings[2].left - result.readings[1].left, 100 / 61)
  near(t, result.readings[3].left - result.readings[2].left, 200 / 61)
})

test('une période inversée, vide ou incomplète ne produit aucune barre ni étendue artificielle', t => {
  const result = buildCampaignTimeline({
    indexDates: ['2026-05-20'], periods: [
      need('2031-01-01', '2030-01-01'), need('2040-01-01', ''), need('2026-05-01', '2026-05-01')
    ]
  })
  t.is(result.startDate, '2026-05-01')
  t.is(result.endDate, '2026-06-01')
  t.true(result.needs.every(item => !item.valid && item.left === null && item.width === null && item.inclusiveEndDate === null))
  t.true(result.pending.some(item => item.detail.includes('suivre son début')))
  t.true(result.pending.some(item => item.detail.includes('à préciser')))
})

test('aucune date exploitable ne crée ni axe, ni date du jour, ni intervalle inventé', t => {
  const result = buildCampaignTimeline({indexDates: ['', '2026-02-30', '2026-01-01-extra'], periods: [need('', '')]})
  t.is(result.startDate, null)
  t.is(result.endDate, null)
  t.deepEqual(result.years, [])
  t.deepEqual(result.ticks, [])
  t.deepEqual(result.readings, [])
  t.deepEqual(result.response.events, [])
  t.is(result.response.left, null)
  t.false(result.response.valid)
  t.true(result.pending.length >= 3)
})

test('les doublons et relevés désordonnés sont signalés et les positions restent chronologiques', t => {
  const result = buildCampaignTimeline({indexDates: ['2026-06-01', '2026-01-01', '2026-01-01']})
  t.deepEqual(result.readings.map(item => item.date), ['2026-01-01', '2026-06-01'])
  t.deepEqual(result.readings.map(item => item.label), ['Relevé 2', 'Relevé 1'])
  t.true(result.pending.some(item => item.detail.includes('ordre chronologique')))
  t.true(result.pending.some(item => item.detail.includes('déjà présente')))
})

test('une échéance seule est un marqueur, pas une fenêtre dont le début serait inventé', t => {
  const result = buildCampaignTimeline({closesAt: '2026-12-31T23:59'})
  t.is(result.startDate, '2026-12-01')
  t.is(result.endDate, '2027-01-01')
  t.is(result.response.opening, '')
  t.false(result.response.valid)
  t.is(result.response.width, null)
  t.deepEqual(result.response.events.map(event => event.id), ['deadline'])
  t.true(result.pending.some(item => item.id === 'opening'))
})

test('l’ouverture au plus tôt ne prétend pas être une ouverture effective', t => {
  const props = {opensAt: '2026-09-01T00:00', closesAt: '2026-09-30T23:59', status: 'DRAFT'}
  const draft = buildCampaignTimeline(props)
  t.is(draft.response.actualOpening, '')
  t.is(draft.response.events[0].label, 'Ouverture au plus tôt')
  const open = buildCampaignTimeline({...props, status: 'OPEN', openedAt: '2026-09-04T10:00:00Z'})
  t.is(open.response.opening, '2026-09-01')
  t.is(open.response.actualOpening, '2026-09-04')
  t.is(open.response.startDate, '2026-09-04')
  t.deepEqual(open.response.events.slice(0, 2).map(event => event.id), ['opening', 'actual-opening'])
  t.true(open.response.left > draft.response.left)
})

test('une clôture obsolète est ignorée après réouverture de campagne', t => {
  const result = buildCampaignTimeline({
    status: 'OPEN', openedAt: '2026-09-01T10:00:00Z', closedAt: '2030-01-01T10:00:00Z', closesAt: '2026-09-30T23:59'
  })
  t.is(result.response.actualClosing, '')
  t.is(result.response.endDate, '2026-10-01')
  t.is(result.endDate, '2026-10-01')
  t.false(result.response.events.some(event => event.id === 'actual-closing'))
})

test('une campagne clôturée distingue l’échéance prévue et la clôture enregistrée', t => {
  const result = buildCampaignTimeline({
    status: 'CLOSED', openedAt: '2026-09-01T10:00:00Z', closedAt: '2026-09-18T10:00:00Z', closesAt: '2026-09-30T23:59', reminderDays: [14, 3]
  })
  t.is(result.response.actualClosing, '2026-09-18')
  t.is(result.response.endDate, '2026-09-19')
  t.is(result.response.deadline, '2026-09-30')
  t.true(result.response.events.some(event => event.id === 'actual-closing'))
  t.true(result.response.events.some(event => event.id === 'deadline'))
  t.false(result.response.events.some(event => event.id === 'reminder-3'))
  t.false(result.pending.some(item => item.id === 'invalid-reminder-3'))
})

test('les relances restent des prévisions, avec jours exacts et dédoublonnage', t => {
  const result = buildCampaignTimeline({opensAt: '2026-03-20T00:00', closesAt: '2026-03-30T22:00:00Z', reminderDays: [14, 3, 1, 0, 3, -1, '2']})
  t.deepEqual(result.response.events.filter(event => event.id.startsWith('reminder')).map(event => event.date), ['2026-03-27', '2026-03-29', '2026-03-30'])
  t.true(result.response.events.filter(event => event.id.startsWith('reminder')).every(event => event.label.includes('prévue') && event.detail === 'Réponses encore attendues'))
  t.true(result.pending.some(item => item.id === 'invalid-reminder-14'))
  t.true(result.pending.some(item => item.id === 'invalid-reminders'))
  const unknownDeadline = buildCampaignTimeline({reminderDays: [3]})
  t.is(unknownDeadline.startDate, null)
  t.true(unknownDeadline.pending.some(item => item.id === 'reminders-deadline'))
})

test('une ouverture effective tardive supprime les relances dépassées sans erreur de configuration', t => {
  const props = {opensAt: '2026-09-01T00:00', closesAt: '2026-09-30T23:59', reminderDays: [14, 3]}
  const result = buildCampaignTimeline({...props, status: 'OPEN', openedAt: '2026-09-20T10:00:00Z'})
  t.false(result.response.events.some(event => event.id === 'reminder-14'))
  t.true(result.response.events.some(event => event.id === 'reminder-3'))
  t.false(result.pending.some(item => item.id === 'invalid-reminder-14'))
  const invalidDraft = buildCampaignTimeline({...props, status: 'DRAFT', opensAt: '2026-09-20T00:00'})
  t.true(invalidDraft.pending.some(item => item.id === 'invalid-reminder-14'))
})

test('une clôture persistée après minuit conserve son jour, sans double soustraction de la borne exclusive', t => {
  const schedule = closesAt => buildCampaignTimeline({closesAt, reminderDays: [0], timezone: 'Europe/Paris'}).response
  t.is(schedule('2026-09-30T22:00:00.000Z').deadline, '2026-09-30')
  t.is(schedule('2026-09-30T22:00:00.001Z').deadline, '2026-10-01')
  t.is(schedule('2026-09-30T22:00:10.000Z').deadline, '2026-10-01')
  t.is(schedule('2026-10-01T00:00:10+02:00').deadline, '2026-10-01')
  t.is(schedule('2026-10-01T00:00:00+02:00').deadline, '2026-09-30')
  t.is(schedule('2026-09-30T22:00:10.000Z').events.find(event => event.id === 'reminder-0').date, '2026-10-01')
})

test('les horaires impossibles et dates ISO normalisées ne deviennent pas de faux événements', t => {
  for (const value of ['2026-02-30T00:00:00Z', '2026-09-01T24:00', '2026-09-01T12:60', '2026-09-01T00:00:99Z', 'not-a-date', '2026-09-01T12:30:00']) {
    const result = buildCampaignTimeline({opensAt: value, closesAt: value})
    t.is(result.startDate, null)
    t.deepEqual(result.response.events, [])
    t.true(result.pending.some(item => item.id === 'invalid-opening'))
    t.true(result.pending.some(item => item.id === 'invalid-deadline'))
  }
})

test('le fuseau s’applique aux instants persistés, pas aux dates civiles du formulaire', t => {
  const result = buildCampaignTimeline({timezone: 'America/New_York', opensAt: '2026-09-01T01:00:00Z', closesAt: '2026-10-01T04:00:00Z'})
  t.is(result.response.opening, '2026-08-31')
  t.is(result.response.deadline, '2026-09-30')
  const invalid = buildCampaignTimeline({timezone: 'Not/A_Timezone', opensAt: '2026-09-01T01:00:00Z'})
  t.is(invalid.startDate, null)
  t.true(invalid.pending.some(item => item.id === 'invalid-timezone'))
})

test('une fenêtre inversée garde les deux dates connues sans dessiner de durée négative', t => {
  const result = buildCampaignTimeline({opensAt: '2026-11-10T00:00', closesAt: '2026-11-01T23:59'})
  t.false(result.response.valid)
  t.is(result.response.left, null)
  t.is(result.response.width, null)
  t.is(result.response.events.length, 2)
  t.true(result.pending.some(item => item.id === 'invalid-response-order'))
})

test('un calendrier pluriannuel garde les années et au plus douze repères de mois, jamais de trimestres', t => {
  const result = buildCampaignTimeline({indexDates: ['2025-11-01', '2035-02-15'], periods: [need('2035-03-01', '2036-01-01')]})
  t.is(result.years.length, 11)
  t.true(result.ticks.length <= 12)
  t.true(result.ticks.every(tick => !/^T\d/.test(tick.label)))
  near(t, result.years.reduce((sum, year) => sum + year.width, 0), 100)
  t.true(result.readings.every(item => item.left >= 0 && item.left < 100))
  t.true(result.needs.every(item => item.left >= 0 && item.left + item.width <= 100))
})

test('le modèle est pur et ignore les périodes d’index dans la ligne des besoins', t => {
  const props = {indexDates: ['2026-01-01'], periods: [need('2026-02-01', '2026-03-01'), {kind: 'INDEX', startDate: '2040-01-01', endDate: '2041-01-01'}], reminderDays: [3, 14]}
  const before = JSON.stringify(props)
  const first = buildCampaignTimeline(props)
  t.deepEqual(first, buildCampaignTimeline(props))
  t.is(JSON.stringify(props), before)
  t.is(first.needs.length, 1)
  t.is(first.endDate, '2026-03-01')
})

test('les dates Prisma à minuit UTC sont reconnues sans tronquer les dates impossibles ou horaires arbitraires', t => {
  const result = buildCampaignTimeline({
    indexDates: ['2026-01-01T00:00:00.000Z'], periods: [
      need('2026-02-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z'),
      need('2026-02-30T00:00:00.000Z', '2026-04-01T00:00:00.000Z'),
      need('2026-02-01T15:00:00.000Z', '2026-04-01T00:00:00.000Z')
    ]
  })
  t.is(result.readings[0].date, '2026-01-01')
  t.is(result.needs[0].startDate, '2026-02-01')
  t.is(result.needs[0].inclusiveEndDate, '2026-02-28')
  t.true(result.needs[0].valid)
  t.false(result.needs[1].valid)
  t.false(result.needs[2].valid)
  t.is(result.endDate, '2026-03-01')
})

const openCampaign = {
  status: 'OPEN', timezone: 'Europe/Paris', opensAt: '2026-09-01T07:00:00Z',
  openedAt: '2026-09-01T08:00:00Z', closesAt: '2026-09-30T22:00:00Z', reminderDays: [14, 7, 0]
}

test('la position distingue la préparation, l’ouverture manuelle autorisée et une date limite dépassée', t => {
  const campaign = {...openCampaign, status: 'DRAFT', openedAt: null}
  const before = getCampaignPosition(campaign, '2026-09-01T06:59:59Z')
  t.is(before.phase, 'PREPARATION')
  t.is(before.label, 'Campagne en préparation')
  t.false(before.canOpen)
  t.regex(before.detail, /Ouverture possible à partir du 1 septembre 2026 à 09:00/)
  t.regex(before.detail, /reste à déclencher/)
  const ready = getCampaignPosition(campaign, '2026-09-01T07:00:00Z')
  t.is(ready.phase, 'PREPARATION')
  t.true(ready.canOpen)
  t.false(ready.canRemind)
  t.false(ready.isResponseWindowOpen)
  t.is(ready.nextReminderDate, null)
  const expired = getCampaignPosition(campaign, '2026-09-30T22:00:00Z')
  t.false(expired.canOpen)
  t.regex(expired.detail, /Modifiez le calendrier/)
})

test('la saisie respecte l’instant d’ouverture inclusif et l’instant limite exclusif', t => {
  const before = getCampaignPosition(openCampaign, '2026-09-01T06:59:59.999Z')
  t.is(before.phase, 'SCHEDULED')
  t.false(before.canRemind)
  t.false(before.isResponseWindowOpen)
  t.is(before.nextReminderDate, null)
  const open = getCampaignPosition(openCampaign, '2026-09-01T07:00:00.000Z')
  t.is(open.phase, 'OPEN')
  t.true(open.isResponseWindowOpen)
  t.true(open.canRemind)
  const lastDay = getCampaignPosition(openCampaign, '2026-09-30T21:59:59.999Z')
  t.is(lastDay.phase, 'OPEN')
  t.is(lastDay.remainingDays, 0)
  t.is(lastDay.detail, 'Dernier jour pour répondre.')
  const expired = getCampaignPosition(openCampaign, '2026-09-30T22:00:00.000Z')
  t.is(expired.phase, 'EXPIRED')
  t.is(expired.label, 'Date limite dépassée')
  t.regex(expired.detail, /n’est pas encore clôturée/)
  t.false(expired.canRemind)
  t.false(expired.isResponseWindowOpen)
  t.is(expired.nextReminderDate, null)
  t.is(expired.actualClosingDate, '')
})

test('une clôture effective est prioritaire sur les dates prévues et une ancienne clôture est ignorée après réouverture', t => {
  const campaign = {...openCampaign, closedAt: '2026-09-10T10:00:00Z'}
  const closed = getCampaignPosition({...campaign, status: 'CLOSED'}, '2026-09-11T12:00:00Z')
  t.is(closed.phase, 'CLOSED')
  t.is(closed.label, 'Saisie terminée')
  t.is(closed.detail, 'Campagne clôturée le 10 septembre 2026.')
  t.is(closed.actualClosingDate, '2026-09-10')
  t.false(closed.canRemind)
  t.is(closed.nextReminderDate, null)
  const reopened = getCampaignPosition(campaign, '2026-09-11T12:00:00Z')
  t.is(reopened.phase, 'OPEN')
  t.is(reopened.actualClosingDate, '')
  const unknown = getCampaignPosition({...campaign, status: 'CLOSED', closedAt: null}, '2026-09-11T12:00:00Z')
  t.regex(unknown.detail, /date de clôture n’est pas renseignée/)
  t.notRegex(unknown.detail, /30 septembre/)
})

test('le nombre de jours restants utilise les jours civils du fuseau, même aux deux changements d’heure', t => {
  const spring = getCampaignPosition({status: 'OPEN', timezone: 'Europe/Paris', closesAt: '2026-03-30T22:00:00Z'}, '2026-03-28T23:30:00Z')
  t.is(spring.today, '2026-03-29')
  t.is(spring.deadlineDate, '2026-03-30')
  t.is(spring.remainingDays, 1)
  t.is(spring.detail, 'Encore 1 jour pour répondre.')
  const autumn = getCampaignPosition({status: 'OPEN', timezone: 'Europe/Paris', closesAt: '2026-10-26T23:00:00Z'}, '2026-10-24T22:30:00Z')
  t.is(autumn.today, '2026-10-25')
  t.is(autumn.remainingDays, 1)
  const newYork = getCampaignPosition({status: 'OPEN', timezone: 'America/New_York', closesAt: '2026-09-12T04:00:00Z'}, '2026-09-10T01:00:00Z')
  t.is(newYork.today, '2026-09-09')
  t.is(newYork.remainingDays, 2)
})

test('la prochaine relance est seulement une prévision future de 9 h dans la fenêtre de réponse', t => {
  const campaign = {...openCampaign, reminderDays: [14, 14, 7, 0]}
  const before = getCampaignPosition(campaign, '2026-09-16T06:59:59Z')
  t.is(before.nextReminderDate, '2026-09-16')
  const reached = getCampaignPosition(campaign, '2026-09-16T07:00:00Z')
  t.is(reached.nextReminderDate, '2026-09-23')
  const lastDay = getCampaignPosition(campaign, '2026-09-30T07:00:00Z')
  t.is(lastDay.nextReminderDate, null)
  const lateOpening = getCampaignPosition({...campaign, openedAt: '2026-09-20T10:00:00Z'}, '2026-09-20T11:00:00Z')
  t.is(lateOpening.nextReminderDate, '2026-09-23')
  const morningDeadline = getCampaignPosition({...campaign, closesAt: '2026-09-30T06:00:00Z'}, '2026-09-30T05:00:00Z')
  t.is(morningDeadline.nextReminderDate, null)
  const spring = getCampaignPosition({status: 'OPEN', closesAt: '2026-03-30T22:00:00Z', reminderDays: [1]}, '2026-03-29T06:59:00Z')
  t.is(spring.nextReminderDate, '2026-03-29')
  t.is(getCampaignPosition({status: 'OPEN', closesAt: '2026-03-30T22:00:00Z', reminderDays: [1]}, '2026-03-29T07:00:00Z').nextReminderDate, null)
})

test('aucune horloge implicite, date invalide ou absence d’échéance ne crée de compte à rebours trompeur', t => {
  for (const now of [undefined, null, 'incorrect']) {
    const position = getCampaignPosition(openCampaign, now)
    t.is(position.today, '')
    t.is(position.phase, 'UNKNOWN')
    t.is(position.remainingDays, null)
    t.false(position.canRemind)
    t.is(position.nextReminderDate, null)
  }

  for (const campaign of [{...openCampaign, closesAt: '2026-02-30T22:00:00Z'}, {...openCampaign, timezone: 'Not/A_Timezone'}]) {
    const position = getCampaignPosition(campaign, '2026-09-10T10:00:00Z')
    t.is(position.phase, 'UNKNOWN')
    t.false(position.canRemind)
    t.is(position.remainingDays, null)
  }

  const noDeadline = getCampaignPosition({status: 'OPEN'}, '2026-09-10T10:00:00Z')
  t.true(noDeadline.isResponseWindowOpen)
  t.is(noDeadline.remainingDays, null)
  t.is(noDeadline.detail, 'Aucune date limite définie.')
  t.is(noDeadline.nextReminderDate, null)
})

test('la position accepte les dates civiles sans dépendre du fuseau du navigateur et conserve les données', t => {
  const campaign = {...openCampaign, opensAt: '2026-09-01T09:00', closesAt: '2026-09-30'}
  const before = structuredClone(campaign)
  const position = getCampaignPosition(campaign, '2026-09-30T21:59:59Z')
  t.is(position.phase, 'OPEN')
  t.is(position.deadlineDate, '2026-09-30')
  t.is(getCampaignPosition(campaign, '2026-09-30T22:00:00Z').phase, 'EXPIRED')
  t.deepEqual(campaign, before)
})
