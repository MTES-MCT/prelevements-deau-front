import test from 'ava'

import {
  addCampaignReadingDate, CAMPAIGN_CONFIG_STEPS, campaignConfigurationErrors, campaignConfigurationPayload, campaignIndexPeriods, defaultCampaignCalendar,
  initialCampaignConfiguration, newCampaignPeriod, removeCampaignReadingDate, replaceCampaignReadingDate
} from './campaign-configuration.js'
import {campaignInclusiveEnd} from './collection-campaigns.js'

const options = {zones: [{id: 'zone', name: 'Territoire'}], collecteurs: [{userId: 'owner', label: 'OUGC'}]}
const initial = () => initialCampaignConfiguration(undefined, options, 2026)

test('la configuration suit trois étapes et se termine par les points concernés', t => {
  t.deepEqual(CAMPAIGN_CONFIG_STEPS, ['Organisation', 'Calendrier', 'Points concernés'])
})

test('les périodes de prélèvement suivent exactement les relevés, les besoins restent indépendants', t => {
  const {indexDates, periods} = defaultCampaignCalendar(2026)
  t.deepEqual(indexDates, ['2025-10-31', '2026-06-01', '2026-10-31'])
  t.deepEqual(periods.filter(period => period.kind === 'INDEX').map(period => [period.startDate, period.endDate, period.startReadingDate, period.endReadingDate]), [
    ['2025-10-31', '2026-06-01', '2025-10-31', '2026-06-01'],
    ['2026-06-01', '2026-10-31', '2026-06-01', '2026-10-31']
  ])
  t.deepEqual(periods.filter(period => period.kind === 'NEEDS').map(period => [period.kind, period.startDate, campaignInclusiveEnd(period.endDate)]), [
    ['NEEDS', '2027-06-01', '2027-10-31'],
    ['NEEDS', '2027-11-01', '2028-05-31']
  ])
  t.is(periods[0].startReadingDate, '2025-10-31')
  t.is(periods[1].endReadingDate, '2026-10-31')
  t.deepEqual(periods.map(period => period.label), ['Période 1', 'Période 2', 'Période 1', 'Période 2'])
})

test('un seul organisme et territoire : préremplissage ; plusieurs choix : décision explicite', t => {
  const form = initial()
  t.is(form.zoneId, 'zone')
  t.is(form.ownerCollecteurUserId, 'owner')
  t.is(form.name, 'Relevés 2026 et besoins 2027')
  t.deepEqual(form.targets, [])
  const multiple = initialCampaignConfiguration(undefined, {...options, zones: [{id: 'z1'}, {id: 'z2'}]}, 2026)
  t.is(multiple.zoneId, '')
  t.is(multiple.ownerCollecteurUserId, '')
  t.deepEqual(campaignConfigurationErrors(multiple, 0), ['Choisissez le territoire concerné.', 'Choisissez le collecteur responsable.'])
})

test('création du brouillon sans points autorisée et aucun droit ajouté implicitement', t => {
  const form = initial()
  t.deepEqual(campaignConfigurationErrors(form), [])
  const payload = campaignConfigurationPayload(form)
  t.deepEqual(payload.targets, [])
  t.deepEqual(payload.managers, [])
  t.deepEqual(payload.reminderDays, [])
  t.is(payload.timezone, 'Europe/Paris')
  t.is(payload.opensAt, null)
  t.is(payload.closesAt, null)
  t.false('expectedVersion' in payload)
})

test('une campagne existante conserve calendrier personnalisé, fuseau invisible, droits et version', t => {
  const context = {
    campaign: {
      ...initial(), id: 'campaign', status: 'OPEN', name: 'Collecte personnalisée', version: 8, year: 2024, timezone: 'Indian/Reunion', opensAt: '2026-09-01T08:30:00Z', closesAt: '2026-10-01T15:45:00Z', managers: [{userId: 'reader', role: 'READER'}]
    },
    targets: [{exploitationId: 'a', eligibilityConfirmed: true}, {exploitationId: 'b', eligibilityConfirmed: false}]
  }
  context.campaign.periods[0].label = 'Ma période de prélèvements'
  const form = initialCampaignConfiguration(context, {}, 2026)
  t.is(form.name, 'Collecte personnalisée')
  t.is(form.periods[0].label, 'Ma période de prélèvements')
  t.is(form.year, 2024)
  t.is(form.opensAt, '2026-09-01T12:30')
  t.deepEqual(form.targets, context.targets)
  const payload = campaignConfigurationPayload(form, context.campaign)
  t.is(payload.timezone, 'Indian/Reunion')
  t.is(payload.expectedVersion, 8)
  t.is(payload.opensAt, '2026-09-01T08:30:00.000Z')
  t.is(payload.closesAt, '2026-10-01T15:45:00.000Z')
  t.deepEqual(payload.managers, [{userId: 'reader', role: 'READER'}])
})

test('date limite incluse : conversion indépendante du fuseau du navigateur avec heure été/hiver', t => {
  const form = initial()
  for (const [date, expected] of [['2026-09-30', '2026-09-30T22:00:00.000Z'], ['2026-11-30', '2026-11-30T23:00:00.000Z']]) {
    t.is(campaignConfigurationPayload({...form, closesAt: `${date}T23:59`}).closesAt, expected)
  }
})

test('enregistrer la sélection confirme les points conservés sans modifier le formulaire initial', t => {
  const form = {...initial(), targets: [{exploitationId: 'retained', eligibilityConfirmed: false}, {exploitationId: 'selected', eligibilityConfirmed: true}]}
  t.deepEqual(campaignConfigurationPayload(form).targets, [{exploitationId: 'retained', eligibilityConfirmed: true}, {exploitationId: 'selected', eligibilityConfirmed: true}])
  t.false(form.targets[0].eligibilityConfirmed)
  t.deepEqual(campaignConfigurationPayload({...form, targets: []}).targets, [])
})

test('la réédition d’une date limite à minuit réaffiche le dernier jour autorisé sans changer la clôture', t => {
  const campaign = {...initial(), closesAt: '2026-09-30T22:00:00.000Z', version: 1}
  const form = initialCampaignConfiguration({campaign}, options, 2026)
  t.is(form.closesAt, '2026-09-30T23:59')
  t.is(campaignConfigurationPayload(form, campaign).closesAt, campaign.closesAt)
})

test('ajouter une date crée la période suivante dès que cette date est renseignée', t => {
  const form = initial()
  const added = {...form, ...addCampaignReadingDate(form)}
  t.deepEqual(added.indexDates, [...form.indexDates, ''])
  t.is(added.periods.filter(period => period.kind === 'INDEX').length, 0)
  t.true(campaignConfigurationErrors(added, 1).some(error => error.includes('dates de relevé')))
  const changes = replaceCampaignReadingDate(added, 3, '2027-06-01')
  const periods = changes.periods.filter(period => period.kind === 'INDEX')
  t.is(periods.length, 3)
  t.is(periods[2].startDate, '2026-10-31')
  t.is(periods[2].endDate, '2027-06-01')
  t.deepEqual(changes.periods.filter(period => period.kind === 'NEEDS'), form.periods.filter(period => period.kind === 'NEEDS'))
})

test('modifier une date met à jour les bornes et les références des deux périodes voisines', t => {
  const form = initial()
  const update = replaceCampaignReadingDate(form, 1, '2026-07-01')
  t.is(update.indexDates[1], '2026-07-01')
  t.is(update.periods[0].endReadingDate, '2026-07-01')
  t.is(update.periods[0].endDate, '2026-07-01')
  t.is(update.periods[1].startReadingDate, '2026-07-01')
  t.is(update.periods[1].startDate, '2026-07-01')
  t.deepEqual(update.periods[2], form.periods[2])
  t.is(form.indexDates[1], '2026-06-01')
})

test('erreurs de calendrier compréhensibles avant enregistrement : dates absentes ou dupliquées', t => {
  const form = initial()
  t.true(campaignConfigurationErrors({...form, indexDates: ['', '']}, 1).some(error => error.includes('dates de relevé')))
  t.true(campaignConfigurationErrors({...form, indexDates: ['2026-02-30', '2026-11-01']}, 1).some(error => error.includes('dates de relevé')))
  t.true(campaignConfigurationErrors({...form, indexDates: ['2026-11-01', '2026-11-01']}, 1).some(error => error.includes('dates de relevé')))
})

test('le calendrier signale chevauchement des besoins et dates inversées sans champs de calcul à remplir', t => {
  const form = initial()
  form.periods[3].startDate = '2027-10-01'
  form.indexDates.reverse()
  const errors = campaignConfigurationErrors(form, 1)
  t.true(errors.some(error => error.includes('chevaucher')))
  t.true(errors.some(error => error.includes('ordre chronologique')))
  t.deepEqual(campaignConfigurationErrors({...initial(), periods: []}, 1), ['Ajoutez au moins une période de besoins.'])
})

test('la validation de chaque étape ne bloque pas sur les champs des étapes suivantes', t => {
  const form = {...initial(), name: '', periods: []}
  t.deepEqual(campaignConfigurationErrors(form, 0), ['Donnez un nom à la campagne.'])
  t.deepEqual(campaignConfigurationErrors(form, 2), [])
  t.deepEqual(campaignConfigurationErrors({...initial(), opensAt: '2026-11-01T00:00', closesAt: '2026-10-01T23:59'}, 1), [
    'La date limite de réponse doit être postérieure au début de la saisie.',
    'La date limite de réponse ne peut pas précéder le dernier relevé demandé.'
  ])
})

test('le calendrier regroupe aussi les erreurs d’ouverture, de clôture et de relance', t => {
  const cases = [
    [{opensAt: 'invalide'}, 'Renseignez des dates d’ouverture et de clôture valides.'],
    [{closesAt: 'invalide'}, 'Renseignez des dates d’ouverture et de clôture valides.'],
    [{reminderDays: [14]}, 'Indiquez une date limite de réponse pour programmer les relances.'],
    [{opensAt: '2026-11-15T00:00', closesAt: '2026-11-30T23:59', reminderDays: [30]}, 'Une relance est prévue avant le début de la saisie. Décalez l’ouverture ou choisissez une relance plus proche de la date limite.']
  ]
  for (const [changes, message] of cases) {
    const form = {...initial(), ...changes}
    t.deepEqual(campaignConfigurationErrors(form, 1), [message])
    t.deepEqual(campaignConfigurationErrors(form), [message])
    t.deepEqual(campaignConfigurationErrors(form, 0), [])
    t.deepEqual(campaignConfigurationErrors(form, 2), [])
  }
})

test('la validation finale conserve toutes les erreurs des trois étapes sans doublon', t => {
  const form = {
    ...initial(), name: '', periods: [], reminderDays: [14]
  }
  const errors = CAMPAIGN_CONFIG_STEPS.flatMap((_label, step) => campaignConfigurationErrors(form, step))
  t.deepEqual(campaignConfigurationErrors(form), errors)
  t.deepEqual(errors, [
    'Donnez un nom à la campagne.',
    'Ajoutez au moins une période de besoins.',
    'Indiquez une date limite de réponse pour programmer les relances.'
  ])
})

test('les trois étapes préservent le payload, les dates et le contrôle de version sans mutation', t => {
  const form = {
    ...initial(), name: '  Campagne personnalisée  ', year: '2026',
    opensAt: '2026-11-01T00:00', closesAt: '2026-11-30T23:59', reminderDays: [14, 3, 0],
    openingMessage: 'Merci de transmettre les deux réponses.\nVotre collecteur reste disponible.',
    managers: [{userId: 'manager', role: 'READER'}],
    targets: [{exploitationId: 'selected', eligibilityConfirmed: false}]
  }
  const campaign = {id: 'campaign', status: 'DRAFT', version: 7}
  const snapshot = structuredClone({form, campaign})
  for (const step of CAMPAIGN_CONFIG_STEPS.keys()) {
    t.deepEqual(campaignConfigurationErrors(form, step), [])
  }

  const payload = campaignConfigurationPayload(form, campaign)
  t.deepEqual(payload, {
    ...snapshot.form, name: 'Campagne personnalisée', year: 2026,
    opensAt: '2026-10-31T23:00:00.000Z', closesAt: '2026-11-30T23:00:00.000Z',
    targets: [{exploitationId: 'selected', eligibilityConfirmed: true}], expectedVersion: 7
  })
  t.deepEqual(campaignConfigurationPayload(form, {...campaign, version: 8}), {...payload, expectedVersion: 8})
  t.deepEqual({form, campaign}, snapshot)
})

test('seules les périodes de besoins sont ajoutées et paramétrées explicitement', t => {
  const form = initial()
  const period = newCampaignPeriod('NEEDS', form.periods)
  t.is(period.position, 2)
  t.is(period.startDate, '2028-06-01')
  t.false('startReadingDate' in period)
  t.false('endReadingDate' in period)
  t.is(form.periods.length, 4)
})

test('retirer une date centrale réunit les périodes, sans supprimer les besoins ni passer sous deux dates', t => {
  const form = initial()
  const removed = removeCampaignReadingDate(form, 1)
  t.deepEqual(removed.indexDates, ['2025-10-31', '2026-10-31'])
  t.deepEqual(removed.periods.filter(period => period.kind === 'INDEX'), campaignIndexPeriods(removed.indexDates))
  t.deepEqual(removed.periods.filter(period => period.kind === 'NEEDS'), form.periods.filter(period => period.kind === 'NEEDS'))
  t.deepEqual(removeCampaignReadingDate({...form, ...removed}, 0).indexDates, removed.indexDates)
  t.deepEqual(removeCampaignReadingDate(form, 0).indexDates, ['2026-06-01', '2026-10-31'])
  t.deepEqual(removeCampaignReadingDate(form, 2).indexDates, ['2025-10-31', '2026-06-01'])
})

test('une date invalide, vide, dupliquée ou inversée ne conserve jamais des bornes périmées', t => {
  const form = initial()
  for (const value of ['', '2026-02-30', '2025-10-31', '2025-01-01']) {
    const changed = {...form, ...replaceCampaignReadingDate(form, 1, value)}
    t.is(changed.periods.filter(period => period.kind === 'INDEX').length, 0)
    t.true(campaignConfigurationErrors(changed, 1).length > 0)
    t.deepEqual(changed.periods.filter(period => period.kind === 'NEEDS'), form.periods.filter(period => period.kind === 'NEEDS'))
  }

  t.deepEqual(campaignIndexPeriods(['2024-02-28', '2024-02-29', '2024-03-01']).map(period => [period.startDate, period.endDate]), [['2024-02-28', '2024-02-29'], ['2024-02-29', '2024-03-01']])
})

test('le payload reconstruit les périodes à partir des dates même si un ancien état contient des périodes différentes', t => {
  const form = initial()
  form.periods[0].startDate = '2025-11-01'
  form.periods[1].endDate = '2026-11-01'
  form.indexDates[1] = '2026-07-01'
  const payload = campaignConfigurationPayload(form, {status: 'DRAFT', version: 3})
  t.deepEqual(payload.periods.filter(period => period.kind === 'INDEX'), campaignIndexPeriods(form.indexDates))
  t.deepEqual(payload.periods.filter(period => period.kind === 'NEEDS'), form.periods.filter(period => period.kind === 'NEEDS'))
  t.is(form.periods[0].startDate, '2025-11-01')
})

test('seul le formulaire du brouillon adopte le calendrier simplifié, aucune campagne enregistrée n’est réécrite au chargement', t => {
  const campaign = {
    ...initial(), id: 'campaign', status: 'DRAFT', version: 1
  }
  campaign.periods[0].startDate = '2025-11-01'
  campaign.periods[1].endDate = '2026-11-01'
  const snapshot = structuredClone(campaign)
  const form = initialCampaignConfiguration({campaign})
  t.deepEqual(form.periods.filter(period => period.kind === 'INDEX'), campaignIndexPeriods(form.indexDates))
  t.deepEqual(campaign, snapshot)
  for (const status of ['OPEN', 'CLOSED']) {
    const existing = {...campaign, status}
    const frozen = initialCampaignConfiguration({campaign: existing})
    const payload = campaignConfigurationPayload(frozen, existing)
    t.is(payload.periods[0].startDate, '2025-11-01')
    t.is(payload.periods[1].endDate, '2026-11-01')
    t.deepEqual(campaign, snapshot)
  }
})

test('la limite API compte les périodes déduites même pendant la saisie d’une date vide', t => {
  const form = initial()
  form.indexDates = Array.from({length: 99}, (_, index) => new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10))
  form.periods = [...campaignIndexPeriods(form.indexDates), ...form.periods.filter(period => period.kind === 'NEEDS')]
  t.deepEqual(campaignConfigurationErrors(form, 1), [])
  t.deepEqual(addCampaignReadingDate(form).indexDates, form.indexDates)
  form.indexDates[98] = ''
  form.periods = form.periods.filter(period => period.kind === 'NEEDS')
  t.deepEqual(addCampaignReadingDate(form).indexDates, form.indexDates)
  t.true(campaignConfigurationErrors({...form, indexDates: [...form.indexDates, '2027-01-01']}, 1).some(error => error.includes('trop long')))
})

test('les positions restent compatibles avec l’API après plusieurs ajouts et suppressions', t => {
  const form = initial()
  form.periods[1].position = 103
  t.deepEqual(campaignConfigurationPayload(form).periods.map(period => period.position), [0, 1, 0, 1])
  t.is(form.periods[1].position, 103)
})
